import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUserData } from '@/lib/auth-server';
import { getCorsHeaders, handleCorsOptions } from '@/lib/cors';

export async function OPTIONS(req) {
  return handleCorsOptions(req);
}

export async function GET(req) {
  try {
    const authData = await getAuthUserData(req);
    if (!authData?.userId) {
      return NextResponse.json({ authenticated: false, user: null }, { headers: getCorsHeaders(req) });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: authData.userId },
      select: {
        clerkId: true,
        email: true,
        name: true,
        username: true,
        avatar: true,
        isAdmin: true,
        isBlocked: true,
      },
    });

    if (!user || user.isBlocked) {
      return NextResponse.json({ authenticated: false, user: null }, { headers: getCorsHeaders(req) });
    }

    const nameParts = (user.name || 'User').trim().split(/\s+/);
    const firstName = nameParts[0] || 'User';
    const lastName = nameParts.slice(1).join(' ') || '';

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.clerkId,
        uid: user.clerkId,
        fullName: user.name || 'User',
        firstName,
        lastName,
        username: user.username || null,
        imageUrl: user.avatar || '',
        avatar: user.avatar || 'user',
        primaryEmailAddress: { emailAddress: user.email },
        emailAddresses: [{ emailAddress: user.email }],
        publicMetadata: user.isAdmin ? { role: 'admin' } : {},
      },
    }, { headers: getCorsHeaders(req) });
  } catch (err) {
    console.error('[auth/me] Error:', err);
    return NextResponse.json({ authenticated: false, user: null }, { status: 500, headers: getCorsHeaders(req) });
  }
}
