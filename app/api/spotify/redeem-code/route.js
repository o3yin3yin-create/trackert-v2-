import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth-server';
import { getCorsHeaders, handleCorsOptions } from '@/lib/cors';
import prisma from '@/lib/prisma';

export async function OPTIONS(req) {
  return handleCorsOptions(req);
}

export async function POST(req) {
  const cors = getCorsHeaders(req);
  const userId = await getAuthUserId(req);

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: cors });
  }

  try {
    const body = await req.json();
    let rawCode = (body?.code || '').trim().toUpperCase().replace(/\s+/g, '');

    // Allow user to paste with or without hyphens
    if (rawCode.includes('BOKRA')) {
      const rest = rawCode.replace(/^BOKRA-?/, '').replace(/-/g, '');
      if (rest.length === 8) {
        rawCode = `BOKRA-${rest.slice(0, 4)}-${rest.slice(4)}`;
      }
    }

    if (!rawCode) {
      return NextResponse.json({ error: 'Please enter a valid invite code' }, { status: 400, headers: cors });
    }

    // 1. Get or create current user
    let user = await prisma.user.findUnique({
      where: { clerkId: userId }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          clerkId: userId,
          email: `${userId}@bokra.app`,
          hasSpotifyAccess: false
        }
      });
    }

    // If user already has access
    if (user.hasSpotifyAccess) {
      return NextResponse.json({
        success: true,
        alreadyUnlocked: true,
        message: 'Spotify access is already unlocked on your account'
      }, { status: 200, headers: cors });
    }

    // 2. Find invite code in database
    const invite = await prisma.spotifyInviteCode.findUnique({
      where: { code: rawCode }
    });

    if (!invite) {
      return NextResponse.json({
        error: 'Invalid invite code. Please check the code and try again.'
      }, { status: 400, headers: cors });
    }

    if (invite.isUsed) {
      return NextResponse.json({
        error: 'This invite code has already been redeemed.'
      }, { status: 400, headers: cors });
    }

    // 3. Redeem code atomically
    await prisma.$transaction([
      prisma.spotifyInviteCode.update({
        where: { id: invite.id },
        data: {
          isUsed: true,
          usedBy: user.id,
          usedAt: new Date()
        }
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          hasSpotifyAccess: true
        }
      })
    ]);

    return NextResponse.json({
      success: true,
      message: 'Spotify beta access unlocked successfully'
    }, { status: 200, headers: cors });
  } catch (error) {
    console.error('[Spotify Redeem Code Error]:', error);
    return NextResponse.json({
      error: error?.message || 'Failed to redeem invite code'
    }, { status: 500, headers: cors });
  }
}
