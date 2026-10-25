import { NextResponse } from 'next/server';
import { refreshAccessToken, sendPlaybackControl } from '@/lib/spotify';

export async function POST(req) {
  try {
    const refreshToken = 
      req.cookies.get('spotify_refresh_token')?.value || 
      req.headers.get('x-spotify-refresh-token');

    if (!refreshToken) {
      return NextResponse.json({ success: false, error: 'Not connected to Spotify' }, { status: 401 });
    }

    const { action } = await req.json();
    if (!action || !['play', 'pause', 'next', 'previous'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    const tokenData = await refreshAccessToken(refreshToken);
    const result = await sendPlaybackControl(tokenData.access_token, action);

    return NextResponse.json(result);
  } catch (err) {
    console.error('[Spotify Control Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
