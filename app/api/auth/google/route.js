import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { signDesktopToken } from '@/lib/auth-server';
import { getCorsHeaders, handleCorsOptions } from '@/lib/cors';

export async function OPTIONS(req) {
  return handleCorsOptions(req);
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const credential = body.credential || body.token || body.idToken;

    if (!credential) {
      return NextResponse.json(
        { error: 'Missing Google credential' },
        { status: 400, headers: getCorsHeaders(req) }
      );
    }

    // 1. Verify Google ID token via Google's official public tokeninfo endpoint
    const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`, {
      headers: { 'Accept': 'application/json' },
    });

    if (!verifyRes.ok) {
      const errData = await verifyRes.json().catch(() => ({}));
      console.warn('[auth/google] Google token verification failed:', errData);
      return NextResponse.json(
        { error: 'Invalid Google token' },
        { status: 401, headers: getCorsHeaders(req) }
      );
    }

    const payload = await verifyRes.json();
    const { sub, email, name, picture, email_verified } = payload;

    if (!sub || !email) {
      return NextResponse.json(
        { error: 'Incomplete Google account info' },
        { status: 400, headers: getCorsHeaders(req) }
      );
    }

    // Verify audience matches our Google OAuth Client ID
    const validAudiences = [
      '114149572420-bdvcf3ocfbk9dqmk23pmhrm7ksk0asq2.apps.googleusercontent.com',
      '114149572420-hvnsmkla4r421v3mcuOq6tl1874apme7.apps.googleusercontent.com',
      process.env.GOOGLE_CLIENT_ID,
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    ].filter(Boolean);

    const tokenAud = payload.aud;
    if (validAudiences.length > 0 && !validAudiences.includes(tokenAud)) {
      console.warn('[auth/google] Audience mismatch:', tokenAud, 'expected one of:', validAudiences);
      // Non-fatal if client ID matches project number 114149572420
      if (!tokenAud || !tokenAud.startsWith('114149572420-')) {
        return NextResponse.json(
          { error: 'Invalid Google client ID audience' },
          { status: 403, headers: getCorsHeaders(req) }
        );
      }
    }

    // 2. Database lookup: Check if user exists by Google sub (clerkId) OR by email
    let dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          { clerkId: sub },
          { email: email.toLowerCase() },
        ],
      },
      include: {
        habits: { select: { id: true } },
      },
    });

    if (dbUser) {
      // Returning user: Always sync latest Google profile photo and sub/email
      const updateData = {
        clerkId: sub,
        email: email.toLowerCase(),
      };
      if (picture) {
        updateData.avatar = picture;
      }
      dbUser = await prisma.user.update({
        where: { id: dbUser.id },
        data: updateData,
        include: { habits: { select: { id: true } } },
      });
    } else {
      // Brand new user: save Google photo as default avatar
      dbUser = await prisma.user.create({
        data: {
          clerkId: sub,
          email: email.toLowerCase(),
          name: name || 'User',
          avatar: picture || '',
          username: null,
        },
        include: { habits: { select: { id: true } } },
      });
    }

    if (dbUser.isBlocked) {
      return NextResponse.json(
        { error: 'ACCOUNT_BLOCKED' },
        { status: 403, headers: getCorsHeaders(req) }
      );
    }

    // 3. Generate 30-day signed HMAC session token
    const tokenPayload = {
      userId: dbUser.clerkId,
      email: dbUser.email,
      name: dbUser.name,
      username: dbUser.username || null,
      tokenVersion: dbUser.tokenVersion ?? 1,
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
    };

    const sessionToken = signDesktopToken(tokenPayload);

    // 4. Build response user object
    const userFullName = dbUser.name || name || 'User';
    const nameParts = userFullName.trim().split(/\s+/);
    const firstName = nameParts[0] || 'User';
    const lastName = nameParts.slice(1).join(' ') || '';

    const clientUser = {
      id: dbUser.clerkId,
      uid: dbUser.clerkId,
      fullName: userFullName,
      firstName,
      lastName,
      username: dbUser.username || null,
      imageUrl: picture || dbUser.avatar || '',
      avatar: picture || dbUser.avatar || '',
      primaryEmailAddress: { emailAddress: dbUser.email },
      emailAddresses: [{ emailAddress: dbUser.email }],
      publicMetadata: dbUser.isAdmin ? { role: 'admin' } : {},
    };

    const response = NextResponse.json(
      {
        success: true,
        user: clientUser,
        token: sessionToken,
      },
      { headers: getCorsHeaders(req) }
    );

    // 5. Set session cookies (HTTP-only + Secure) with 30-day lifetime
    const cookieOptions = [
      `Path=/`,
      `Max-Age=2592000`, // 30 days
      `SameSite=Lax`,
      `HttpOnly`,
    ];
    if (process.env.NODE_ENV === 'production') {
      cookieOptions.push('Secure');
    }

    response.headers.append(
      'Set-Cookie',
      `__bokra_session=${sessionToken}; ${cookieOptions.join('; ')}`
    );
    response.headers.append(
      'Set-Cookie',
      `__session=${sessionToken}; ${cookieOptions.join('; ')}`
    );

    return response;
  } catch (err) {
    console.error('[auth/google] Login error:', err);
    return NextResponse.json(
      { error: 'Internal authentication error' },
      { status: 500, headers: getCorsHeaders(req) }
    );
  }
}
