import { NextResponse } from 'next/server';
import { getCurrentDbUser } from '@/lib/currentUser';
import { getCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { rateLimit, getClientIp } from '@/lib/rateLimit';
import { cancelScheduledPush, schedulePush } from '@/lib/pushSchedule';

export async function OPTIONS(req) {
  return handleCorsOptions(req);
}

export async function POST(req) {
  const ip = getClientIp(req);
  if (!await rateLimit(`push-schedule-ip:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429, headers: getCorsHeaders(req) });
  }

  const me = await getCurrentDbUser(req);
  if (!me) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: getCorsHeaders(req) });
  }

  const body = await req.json().catch(() => ({}));
  const kind = body.kind === 'pomodoro' ? 'pomodoro' : 'lecture';
  const refId = typeof body.refId === 'string' && body.refId ? body.refId.slice(0, 80) : 'active';
  const fireAtMs = Number(body.fireAtMs);
  const cancel = body.cancel === true;

  if (cancel) {
    await cancelScheduledPush(me.id, kind, refId);
    return NextResponse.json({ ok: true, cancelled: true }, { headers: getCorsHeaders(req) });
  }

  if (!Number.isFinite(fireAtMs)) {
    return NextResponse.json({ error: 'invalid_fire_at' }, { status: 400, headers: getCorsHeaders(req) });
  }

  const result = await schedulePush({
    userId: me.id,
    kind,
    refId,
    fireAtMs,
    title: typeof body.title === 'string' ? body.title.slice(0, 120) : 'bokra',
    body: typeof body.body === 'string' ? body.body.slice(0, 240) : '',
    url: typeof body.url === 'string' ? body.url.slice(0, 200) : '/',
    tag: typeof body.tag === 'string' ? body.tag.slice(0, 80) : `${kind}:${refId}`,
  });

  return NextResponse.json(result, { headers: getCorsHeaders(req) });
}
