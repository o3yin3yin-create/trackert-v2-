import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const t0 = Date.now();
  let dbStatus = 'ok';
  let dbLatencyMs = 0;

  try {
    // Keep Neon PostgreSQL compute endpoint warm and prevent auto-suspend
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - t0;
  } catch (err) {
    dbStatus = 'error';
    console.warn('[ping] DB ping error:', err?.message);
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
