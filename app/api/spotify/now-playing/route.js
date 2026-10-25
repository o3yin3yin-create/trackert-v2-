import { NextResponse } from 'next/server';
import { refreshAccessToken, fetchCurrentlyPlaying } from '@/lib/spotify';
import { getAuthUserId } from '@/lib/auth-server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    let refreshToken = 
      req.cookies.get('spotify_refresh_token')?.value || 
      req.headers.get('x-spotify-refresh-token');

    // If no token from cookie/header, check user in database (handles desktop app sync)
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
      } catch (authErr) {
        // Continue
      }
    }

    if (!refreshToken) {
      return NextResponse.json({ isConnected: false, isPlaying: false });
    }

    // 1. Refresh access token
    let tokenData;
    try {
      tokenData = await refreshAccessToken(refreshToken);
    } catch (tokenErr) {
      console.warn('[Spotify] Refresh token expired or revoked:', tokenErr.message);
      const res = NextResponse.json({ isConnected: false, isPlaying: false, error: 'Token expired' });
      res.cookies.delete('spotify_refresh_token');
      return res;
    }

    const accessToken = tokenData.access_token;
    if (!accessToken) {
      return NextResponse.json({ isConnected: false, isPlaying: false });
    }

    // 2. Fetch playback state
    const rawData = await fetchCurrentlyPlaying(accessToken);

    if (!rawData || !rawData.item) {
      return NextResponse.json({
        isConnected: true,
        isPlaying: false,
        item: null,
      });
    }

    const item = rawData.item;
    const isPlaying = Boolean(rawData.is_playing);
    const progressMs = rawData.progress_ms || 0;
    const durationMs = item.duration_ms || 0;

    const title = item.name || '';
    const artist = (item.artists || []).map(a => a.name).join(', ') || 'Unknown Artist';
    const album = item.album?.name || '';
    const albumArt = item.album?.images?.[0]?.url || item.album?.images?.[1]?.url || null;
    const songUrl = item.external_urls?.spotify || null;
    const deviceName = rawData.device?.name || null;

    return NextResponse.json({
      isConnected: true,
      isPlaying,
      title,
      artist,
      album,
      albumArt,
      progressMs,
      durationMs,
      songUrl,
      deviceName,
    });
  } catch (err) {
    console.error('[Spotify Now Playing Error]:', err);
    return NextResponse.json({ isConnected: false, isPlaying: false, error: err.message }, { status: 500 });
  }
}
