import { NextResponse } from 'next/server';
import { exchangeCodeForTokens, getRedirectUri } from '@/lib/spotify';
import { getAuthUserId } from '@/lib/auth-server';
import prisma from '@/lib/prisma';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const stateParam = searchParams.get('state');

  const origin = req.headers?.get?.('x-forwarded-host') 
    ? `${req.headers.get('x-forwarded-proto') || 'https'}://${req.headers.get('x-forwarded-host')}`
    : new URL(req.url).origin;

  let fromDesktop = false;
  let desktopPort = '28282';
  let userId = null;

  if (stateParam) {
    try {
      const decoded = JSON.parse(Buffer.from(stateParam, 'base64url').toString('utf-8'));
      if (decoded?.u && typeof decoded.u === 'string' && decoded.u.length < 128) userId = decoded.u;
      if (decoded?.f === 'desktop') fromDesktop = true;
      if (decoded?.p && /^\d{4,5}$/.test(String(decoded.p))) {
        const pNum = parseInt(decoded.p, 10);
        if (pNum >= 1024 && pNum <= 65535) desktopPort = String(pNum);
      }
    } catch (e) {}
  }

  if (error || !code) {
    console.warn('[Spotify Auth] Access denied or error:', error);
    if (fromDesktop) {
      return NextResponse.redirect(`http://127.0.0.1:${desktopPort}/callback?spotify_error=${encodeURIComponent(error || 'no_code')}`);
    }
    return NextResponse.redirect(`${origin}/?spotify_error=${encodeURIComponent(error || 'no_code')}`);
  }

  try {
    const redirectUri = getRedirectUri(req);
    const tokenData = await exchangeCodeForTokens(code, redirectUri);
    const refreshToken = tokenData.refresh_token;

    if (!refreshToken) {
      throw new Error('No refresh token received from Spotify');
    }

    // Try saving to database for authenticated user
    try {
      if (!userId) {
        userId = await getAuthUserId(req);
      }
      if (userId) {
        await prisma.user.upsert({
          where: { clerkId: userId },
          update: { spotifyRefreshToken: refreshToken },
          create: {
            clerkId: userId,
            email: `${userId}@bokra.app`,
            spotifyRefreshToken: refreshToken
          }
        });
      }
    } catch (dbErr) {
      console.warn('[Spotify DB save skipped]:', dbErr.message);
    }

    // Direct redirect to Desktop loopback listener if request initiated from Desktop app
    const targetUrl = fromDesktop 
      ? `http://127.0.0.1:${desktopPort}/callback?spotify_token=${encodeURIComponent(refreshToken)}`
      : `${origin}/?spotify_connected=true&spotify_token=${encodeURIComponent(refreshToken)}`;

    const response = NextResponse.redirect(targetUrl);
    
    // Store refresh token in secure HTTP-only cookie (1 year expiry)
    response.cookies.set('spotify_refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 365 * 24 * 60 * 60, // 1 year
    });

    return response;
  } catch (err) {
    console.error('[Spotify Auth Error]:', err);
    if (fromDesktop) {
      return NextResponse.redirect(`http://127.0.0.1:${desktopPort}/callback?spotify_error=token_exchange_failed`);
    }
    return NextResponse.redirect(`${origin}/?spotify_error=token_exchange_failed`);
  }
}
