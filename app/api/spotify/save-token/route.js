import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth-server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const userId = await getAuthUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token } = await req.json();
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 400 });
    }

    await prisma.user.upsert({
      where: { id: userId },
      update: { spotifyRefreshToken: token },
      create: {
        id: userId,
        email: `${userId}@bokra.app`,
        spotifyRefreshToken: token
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Spotify Save Token Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
