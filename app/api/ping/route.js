import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

let lastDbPingAt = 0;
const DB_PING_INTERVAL_MS = 6 * 60 * 60 * 1000; // Touch Postgres once every 6h to prevent 7-day pause without wasting queries every 10m

export async function GET() {
  const t0 = Date.now();
  let dbStatus = 'cached_ok';
  let dbLatencyMs = 0;

  if (t0 - lastDbPingAt >= DB_PING_INTERVAL_MS) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - t0;
      dbStatus = 'ok';
      lastDbPingAt = Date.now();
    } catch (err) {
      dbStatus = 'error';
      console.warn('[ping] DB ping error:', err?.message);
    }
  }

  return NextResponse.json(
    {
      status: 'ok',
      service: 'bokra',
      db: dbStatus,
      dbLatencyMs,
      timestamp: Date.now(),
      uptime: Math.round(process.uptime()),
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }
  );
}

export async function HEAD() {
  return new Response(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
