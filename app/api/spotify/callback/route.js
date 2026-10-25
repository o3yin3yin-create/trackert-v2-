import { NextResponse } from 'next/server';
import { exchangeCodeForTokens, getRedirectUri } from '@/lib/spotify';

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

    const response = NextResponse.redirect(`${origin}/?spotify_connected=true`);
    
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
