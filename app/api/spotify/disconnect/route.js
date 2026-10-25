import { NextResponse } from 'next/server';

export async function POST(req) {
  const response = NextResponse.json({ success: true, message: 'Disconnected from Spotify' });
  response.cookies.delete('spotify_refresh_token');
  return response;
}
