import { NextResponse } from 'next/server';
import { refreshAccessToken, sendPlaybackControl } from '@/lib/spotify';
import { getAuthUserId } from '@/lib/auth-server';
import prisma from '@/lib/prisma';
import { getCorsHeaders, handleCorsOptions } from '@/lib/cors';

export async function OPTIONS(req) {
  return handleCorsOptions(req);
}

export async function POST(req) {
  const corsHeaders = getCorsHeaders(req);
  try {
    let refreshToken = 
      req.cookies.get('spotify_refresh_token')?.value || 
      req.headers.get('x-spotify-refresh-token');

    if (!refreshToken) {
      try {
        const userId = await getAuthUserId(req);
        if (userId) {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { spotifyRefreshToken: true }
          });
          if (user?.spotifyRefreshToken) {
            refreshToken = user.spotifyRefreshToken;
          }
        }
      } catch (e) {}
    }

    if (!refreshToken) {
      return NextResponse.json({ success: false, error: 'Not connected to Spotify' }, { status: 401, headers: corsHeaders });
    }

    const { action } = await req.json();
    if (!action || !['play', 'pause', 'next', 'previous'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400, headers: corsHeaders });
    }

    const tokenData = await refreshAccessToken(refreshToken);
    const result = await sendPlaybackControl(tokenData.access_token, action);

    return NextResponse.json(result, { headers: corsHeaders });
  } catch (err) {
    console.error('[Spotify Control Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: corsHeaders });
  }
}
