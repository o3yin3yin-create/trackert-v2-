import { NextResponse } from 'next/server';

export function getCorsHeaders(req) {
  const origin = req?.headers?.get?.('origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-spotify-refresh-token, X-Requested-With, Accept, Origin',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export function handleCorsOptions(req) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...getCorsHeaders(req),
      'Access-Control-Max-Age': '86400',
    },
  });
}
