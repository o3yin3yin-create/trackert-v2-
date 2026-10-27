import { NextResponse } from 'next/server';
import { getCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { getAuthUserId } from '@/lib/auth-server';
import prisma from '@/lib/prisma';

export async function OPTIONS(req) {
  return handleCorsOptions(req);
}

export async function POST(req) {
  const corsHeaders = getCorsHeaders(req);
  try {
    const userId = await getAuthUserId(req);
    if (userId) {
      await prisma.user.update({
        where: { clerkId: userId },
        data: {
          spotifyRefreshToken: null,
          activeSessionData: {
            spotifyTrack: null,
          }
        }
      }).catch(() => {});
    }
  } catch (_) {}

  const response = NextResponse.json({ success: true, message: 'Disconnected from Spotify' }, { headers: corsHeaders });
  response.cookies.delete('spotify_refresh_token');
  return response;
}
