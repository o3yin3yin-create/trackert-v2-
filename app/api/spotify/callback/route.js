import { NextResponse } from 'next/server';
import { exchangeCodeForTokens, getRedirectUri } from '@/lib/spotify';
import { getAuthUserId } from '@/lib/auth-server';
import prisma from '@/lib/prisma';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const origin = req.headers?.get?.('x-forwarded-host') 
    ? `${req.headers.get('x-forwarded-proto') || 'https'}://${req.headers.get('x-forwarded-host')}`
    : new URL(req.url).origin;

  if (error || !code) {
    console.warn('[Spotify Auth] Access denied or error:', error);
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
      const userId = await getAuthUserId(req);
      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: { spotifyRefreshToken: refreshToken }
        });
      }
    } catch (dbErr) {
      console.warn('[Spotify DB save skipped]:', dbErr.message);
    }

    // Pass token so desktop app and offline storage can persist it
    const response = NextResponse.redirect(`${origin}/?spotify_connected=true&spotify_token=${encodeURIComponent(refreshToken)}`);
    
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
    return NextResponse.redirect(`${origin}/?spotify_error=token_exchange_failed`);
  }
}
