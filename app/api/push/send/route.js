import { NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';
import { sendPush } from '@/lib/push';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function verifyQstash(req, rawBody) {
  const current = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const next = process.env.QSTASH_NEXT_SIGNING_KEY;
  if (!current || !next) return false;
  const signature = req.headers.get('upstash-signature');
  if (!signature) return false;
  const receiver = new Receiver({
    currentSigningKey: current,
    nextSigningKey: next,
  });
  try {
    return await receiver.verify({ signature, body: rawBody });
  } catch {
    return false;
  }
}

export async function POST(req) {
  const rawBody = await req.text();
  const ok = await verifyQstash(req, rawBody);
  if (!ok) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let payload = {};
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'bad_json' }, { status: 400 });
  }

  const userId = typeof payload.userId === 'string' ? payload.userId : '';
  if (!userId) return NextResponse.json({ error: 'missing_user' }, { status: 400 });

  const result = await sendPush(userId, {
    title: payload.title,
    body: payload.body,
    url: payload.url,
    tag: payload.tag,
  });

  if (payload.kind && payload.refId) {
    await prisma.scheduledPush.deleteMany({
      where: { userId, kind: String(payload.kind), refId: String(payload.refId) },
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, ...result });
}
