import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentDbUser } from '@/lib/currentUser';
import { getCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { rateLimit, getClientIp } from '@/lib/rateLimit';

export async function OPTIONS(req) {
  return handleCorsOptions(req);
}

export async function POST(req) {
  const ip = getClientIp(req);
  if (!await rateLimit(`push-register-ip:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429, headers: getCorsHeaders(req) });
  }

  const me = await getCurrentDbUser(req);
  if (!me) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: getCorsHeaders(req) });
  }

  if (!await rateLimit(`push-register:${me.id}`, 20, 60_000)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429, headers: getCorsHeaders(req) });
  }

  const body = await req.json().catch(() => ({}));
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  if (!token || token.length < 20 || token.length > 4096) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 400, headers: getCorsHeaders(req) });
  }

  const platform = typeof body.platform === 'string' ? body.platform.slice(0, 40) : 'web';
  const userAgent = typeof body.userAgent === 'string' ? body.userAgent.slice(0, 400) : null;

  await prisma.pushToken.upsert({
    where: { token },
    create: { userId: me.id, token, platform, userAgent },
    update: { userId: me.id, platform, userAgent },
  });

  return NextResponse.json({ ok: true }, { headers: getCorsHeaders(req) });
}
