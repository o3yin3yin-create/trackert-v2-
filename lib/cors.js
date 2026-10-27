import { NextResponse } from 'next/server';

const ALLOWED_ORIGINS = [
  'https://bokra101.vercel.app',
  'https://bokra.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'tauri://localhost',
  'http://tauri.localhost',
  'asset://localhost',
  'capacitor://localhost',
  'http://localhost'
];

export function getCorsHeaders(req) {
  const origin = req?.headers?.get?.('origin') || '';
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || 
    origin.endsWith('.vercel.app') || 
    origin.startsWith('http://localhost:') || 
    origin.startsWith('http://192.168.');

  const safeOrigin = isAllowed ? origin : 'https://bokra101.vercel.app';

  return {
    'Access-Control-Allow-Origin': safeOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-spotify-refresh-token, X-Requested-With, Accept, Origin',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin',
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
