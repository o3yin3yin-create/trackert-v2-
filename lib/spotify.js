const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '491c8113d9e04931a82e942edc73d67e';
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '59c8d6619b214891a61aa25816f8da6c';
const DEFAULT_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 'https://bokra101.vercel.app/api/spotify/callback';

export const SPOTIFY_SCOPES = [
  'user-read-currently-playing',
  'user-read-playback-state',
  'user-modify-playback-state'
].join(' ');

export function getRedirectUri(req) {
  try {
    if (req) {
      const host = req.headers?.get?.('x-forwarded-host') || req.headers?.get?.('host') || '';
      if (host.includes('localhost') || host.includes('127.0.0.1')) {
        const proto = req.headers?.get?.('x-forwarded-proto') || 'http';
        return `${proto}://${host}/api/spotify/callback`;
      }
    }
  } catch (e) {
    // fallback
  }
  return DEFAULT_REDIRECT_URI;
}

export function getBasicAuthHeader() {
  return 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
}

/**
 * Exchange Authorization Code for Refresh and Access tokens
 */
export async function exchangeCodeForTokens(code, redirectUri) {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri || DEFAULT_REDIRECT_URI,
  });

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': getBasicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Spotify token exchange failed (${res.status}): ${errorText}`);
  }

  return await res.json();
}

/**
 * Get a fresh Access Token using the stored Refresh Token
 */
export async function refreshAccessToken(refreshToken) {
  if (!refreshToken) throw new Error('No refresh token provided');

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': getBasicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Spotify token refresh failed (${res.status}): ${errorText}`);
  }

  return await res.json();
}

/**
 * Fetch the currently playing track from Spotify
 */
export async function fetchCurrentlyPlaying(accessToken) {
  const res = await fetch('https://api.spotify.com/v1/me/player?additional_types=track,episode', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  });

  if (res.status === 204 || res.status === 404) {
    // Nothing is currently playing
    return { isPlaying: false, item: null };
  }

  if (!res.ok) {
    // If player endpoint had issue, try currently-playing fallback
    const fallbackRes = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    });

    if (fallbackRes.status === 204 || fallbackRes.status === 404 || !fallbackRes.ok) {
      return { isPlaying: false, item: null };
    }
    return await fallbackRes.json();
  }

  return await res.json();
}

/**
 * Control playback: play, pause, next, previous
 */
export async function sendPlaybackControl(accessToken, action) {
  let endpoint = '';
  let method = 'POST';

  switch (action) {
    case 'play':
      endpoint = 'https://api.spotify.com/v1/me/player/play';
      method = 'PUT';
      break;
    case 'pause':
      endpoint = 'https://api.spotify.com/v1/me/player/pause';
      method = 'PUT';
      break;
    case 'next':
      endpoint = 'https://api.spotify.com/v1/me/player/next';
      method = 'POST';
      break;
    case 'previous':
      endpoint = 'https://api.spotify.com/v1/me/player/previous';
      method = 'POST';
      break;
    default:
      throw new Error(`Unsupported playback action: ${action}`);
  }

  const res = await fetch(endpoint, {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!res.ok && res.status !== 204) {
    const errorText = await res.text();
    return { success: false, status: res.status, error: errorText };
  }

  return { success: true };
}
