import { NextResponse } from 'next/server';
import { getCorsHeaders, handleCorsOptions } from '@/lib/cors';

export async function OPTIONS(req) {
  return handleCorsOptions(req);
}

export async function POST(req) {
  const corsHeaders = getCorsHeaders(req);
  const response = NextResponse.json({ success: true, message: 'Disconnected from Spotify' }, { headers: corsHeaders });
  response.cookies.delete('spotify_refresh_token');
  return response;
}
