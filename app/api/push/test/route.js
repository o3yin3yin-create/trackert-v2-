import { NextResponse } from 'next/server';
import { getCurrentDbUser } from '@/lib/currentUser';
import { getCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { sendPush } from '@/lib/push';

export async function OPTIONS(req) {
  return handleCorsOptions(req);
}

export async function POST(req) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const me = await getCurrentDbUser(req);
  if (!me) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: getCorsHeaders(req) });
  }

  const body = await req.json().catch(() => ({}));
  const result = await sendPush(me.id, {
    title: typeof body.title === 'string' ? body.title : 'bokra test',
    body: typeof body.body === 'string' ? body.body : 'Push notifications are working.',
    url: '/',
    tag: 'push-test',
  });

  return NextResponse.json({ ok: true, ...result }, { headers: getCorsHeaders(req) });
}
