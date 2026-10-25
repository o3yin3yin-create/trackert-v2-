import { NextResponse } from 'next/server';
import { SPOTIFY_SCOPES, getRedirectUri } from '@/lib/spotify';

export async function GET(req) {
  const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '491c8113d9e04931a82e942edc73d67e';
  const redirectUri = getRedirectUri(req);
  
  const state = Math.random().toString(36).substring(2, 15);
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope: SPOTIFY_SCOPES,
    redirect_uri: redirectUri,
    state,
    show_dialog: 'true', // ensures user can switch or confirm permissions
  });

  const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
  return NextResponse.redirect(authUrl);
}
