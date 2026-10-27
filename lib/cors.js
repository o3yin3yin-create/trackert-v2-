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

export function isAllowedOrigin(origin) {
  if (!origin) return false;
  return (
    ALLOWED_ORIGINS.includes(origin) ||
    /^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/.test(origin) ||
    /^http:\/\/localhost(:\d+)?$/.test(origin) ||
    /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin) ||
    /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin)
  );
}

export function getCorsHeaders(req) {
  const origin = typeof req?.headers?.get === 'function' ? (req.headers.get('origin') || '') : '';
  const allowed = isAllowedOrigin(origin);

  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-spotify-refresh-token, X-Requested-With, Accept, Origin, X-CSRF-Token, X-Api-Version',
    'Vary': 'Origin',
  };

  if (allowed) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
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
