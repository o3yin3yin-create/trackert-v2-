import admin from 'firebase-admin';
import prisma from '@/lib/prisma';
import { siteUrl } from '@/lib/siteUrl';

function getMessaging() {
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (!projectId || !clientEmail || !privateKey) return null;
    try {
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      });
    } catch {
      console.error('[push] Firebase admin init failed');
      return null;
    }
  }
  return admin.messaging();
}

const DEAD_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

function isDeadTokenError(err) {
  const code = err?.code || err?.errorInfo?.code || '';
  if (DEAD_CODES.has(code)) return true;
  const msg = String(err?.message || '').toLowerCase();
  return msg.includes('unregistered') || msg.includes('not a valid fcm') || msg.includes('invalid-argument');
}

function asStringMap(obj) {
  const out = {};
  for (const [key, value] of Object.entries(obj || {})) {
    if (value == null) continue;
    out[String(key)] = String(value);
  }
  return out;
}

/**
 * Send a data-only web push to every device token for a user.
 * @param {string} userId database User.id
 */
export async function sendPush(userId, { title, body, url, tag } = {}) {
  if (!userId) return { sent: 0 };
  const messaging = getMessaging();
  if (!messaging) return { sent: 0, skipped: 'not_configured' };

  const tokens = await prisma.pushToken.findMany({
    where: { userId },
    select: { id: true, token: true },
  });
  if (tokens.length === 0) return { sent: 0 };

  const link = url && String(url).startsWith('http') ? String(url) : `${siteUrl()}${url || '/'}`;
  const data = asStringMap({
    title: title || 'bokra',
    body: body || '',
    url: url || '/',
    tag: tag || 'bokra',
  });

  const deadIds = [];
  let sent = 0;

  await Promise.all(tokens.map(async ({ id, token }) => {
    try {
      await messaging.send({
        token,
        data,
        android: { priority: 'high' },
        webpush: {
          headers: { Urgency: 'high', TTL: '86400' },
          fcmOptions: { link },
        },
        apns: {
          headers: { 'apns-priority': '10' },
          payload: { aps: { 'content-available': 1, sound: 'default' } },
        },
      });
      sent += 1;
    } catch (err) {
      if (isDeadTokenError(err)) deadIds.push(id);
      else console.error('[push] send failed');
    }
  }));

  if (deadIds.length > 0) {
    await prisma.pushToken.deleteMany({ where: { id: { in: deadIds } } }).catch(() => {});
  }

  return { sent, cleaned: deadIds.length };
}
