import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { signDesktopToken } from '@/lib/auth-server';
import { rateLimit, getClientIp } from '@/lib/rateLimit';

export async function POST(req) {
  try {
    const ip = getClientIp(req);
    // Rate limit by IP: max 15 token requests per minute
    if (!await rateLimit(`desktop-token-ip:${ip}`, 15, 60_000)) {
      return NextResponse.json({ error: 'Too many token requests from this IP. Please wait.' }, { status: 429 });
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit by User: max 10 token requests per minute
    if (!await rateLimit(`desktop-token-user:${userId}`, 10, 60_000)) {
      return NextResponse.json({ error: 'Too many token requests. Please wait a moment.' }, { status: 429 });
    }

    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses?.[0]?.emailAddress || '';
    const name = clerkUser?.firstName ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim() : 'User';
    const avatar = clerkUser?.imageUrl || '';
    let username = clerkUser?.username || null;
    let tokenVersion = 1;

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { username: true, tokenVersion: true }
    });
    if (dbUser) {
      if (!username) username = dbUser.username;
      tokenVersion = dbUser.tokenVersion || 1;
    }

    const now = Date.now();
    const token = signDesktopToken({
      userId,
      email,
      name,
      username,
      tokenVersion,
      iat: now,
      exp: now + 7 * 24 * 60 * 60 * 1000, // Strictly valid for max 7 days
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: userId,
        email,
        name,
        avatar,
        username,
      },
    });
  } catch (error) {
    console.error('[Desktop Token Error]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/auth/desktop-token -> Instantly revokes all issued desktop tokens for user
export async function DELETE(req) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ip = getClientIp(req);
    if (!await rateLimit(`desktop-revoke-ip:${ip}`, 10, 60_000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const updated = await prisma.user.update({
      where: { clerkId: userId },
      data: { tokenVersion: { increment: 1 } },
      select: { tokenVersion: true }
    });

    return NextResponse.json({
      success: true,
      message: 'All desktop tokens revoked successfully.',
      currentTokenVersion: updated.tokenVersion
    });
  } catch (error) {
    console.error('[Desktop Token Revoke Error]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
