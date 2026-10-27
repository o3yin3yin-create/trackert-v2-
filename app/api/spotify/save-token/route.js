import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth-server';
import prisma from '@/lib/prisma';
import { getCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { rateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function OPTIONS(req) {
  return handleCorsOptions(req);
}

export async function POST(req) {
  const corsHeaders = getCorsHeaders(req);
  try {
    const userId = await getAuthUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    if (!rateLimit(`spotify-save:${userId}`, 15, 60_000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: corsHeaders });
    }

    const body = await req.json().catch(() => ({}));
    const { token } = body;
    if (!token || typeof token !== 'string' || token.length < 10 || token.length > 1024) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400, headers: corsHeaders });
    }

    await prisma.user.upsert({
      where: { clerkId: userId },
      update: { spotifyRefreshToken: token },
      create: {
        clerkId: userId,
        email: `${userId}@bokra.app`,
        spotifyRefreshToken: token
      }
    });

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (err) {
    console.error('[Spotify Save Token Error]:', err);
    return NextResponse.json({ error: 'Failed to save token' }, { status: 500, headers: corsHeaders });
  }
}
