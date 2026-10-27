import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth-server';
import prisma from '@/lib/prisma';
import { getCorsHeaders, handleCorsOptions } from '@/lib/cors';

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

    const { token } = await req.json();
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 400, headers: corsHeaders });
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
    return NextResponse.json({ error: err.message }, { status: 500, headers: corsHeaders });
  }
}
