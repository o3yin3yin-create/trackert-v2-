import { Client } from '@upstash/qstash';
import prisma from '@/lib/prisma';
import { siteUrl } from '@/lib/siteUrl';

const QSTASH_MAX_DELAY_SEC = 7 * 24 * 60 * 60;

function qstash() {
  const token = process.env.QSTASH_TOKEN;
  if (!token) return null;
  return new Client({ token });
}

function pad(n) {
  return String(n).padStart(2, '0');
}

export function parseClock(timeStr) {
  if (!timeStr) return null;
  const m = String(timeStr).trim().match(/^(\d{1,2})[:.](\d{2})\s*(AM|PM)?$/i);
  if (!m) return null;
  let hour = parseInt(m[1], 10);
  const minute = parseInt(m[2], 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  const period = m[3]?.toUpperCase();
  if (period === 'PM' && hour < 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

function tzOffsetMs(date, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = {};
  for (const p of dtf.formatToParts(date)) {
    if (p.type !== 'literal') parts[p.type] = p.value;
  }
  const hour = Number(parts.hour) === 24 ? 0 : Number(parts.hour);
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    hour,
    Number(parts.minute),
    Number(parts.second)
  );
  return asUtc - date.getTime();
}

export function zonedLocalToUtcMs(year, month, day, hour, minute, timeZone) {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const offset = tzOffsetMs(new Date(utcGuess), timeZone);
  const first = utcGuess - offset;
  const offset2 = tzOffsetMs(new Date(first), timeZone);
  return utcGuess - offset2;
}

function ymdInZone(date, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  const parts = {};
  for (const p of dtf.formatToParts(date)) {
    if (p.type !== 'literal') parts[p.type] = p.value;
  }
  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    dow: weekdayMap[parts.weekday] ?? 0,
  };
}

function isHabitOnDate(habit, y, m, d, dow) {
  const freq = habit.frequency || 'daily';
  const ymd = `${y}-${pad(m)}-${pad(d)}`;
  if (freq === 'daily') return true;
  if (freq === 'weekly') return Array.isArray(habit.scheduleDays) && habit.scheduleDays.includes(dow);
  if (freq === 'once') return habit.scheduleDate === ymd;
  if (freq === 'monthly') return String(habit.scheduleDate) === String(d) || habit.scheduleDate === String(d);
  if (freq === 'yearly') return habit.scheduleDate === `${pad(m)}-${pad(d)}`;
  return true;
}

export function nextLectureFireAt(habit, timeZone = null) {
  const clock = parseClock(habit.time);
  if (!clock) return null;
  const tz = timeZone || (typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC');
  const beforeMin = Number.isFinite(habit.notifyBefore) ? habit.notifyBefore : 15;
  const now = Date.now();
  for (let i = 0; i < 14; i++) {
    const probe = new Date(now + i * 86400000);
    const { year, month, day, dow } = ymdInZone(probe, tz);
    if (!isHabitOnDate(habit, year, month, day, dow)) continue;
    const eventMs = zonedLocalToUtcMs(year, month, day, clock.hour, clock.minute, tz);
    const fireMs = eventMs - beforeMin * 60 * 1000;
    if (fireMs > now + 20000) return fireMs;
  }
  return null;
}

async function cancelQstashMessage(messageId) {
  if (!messageId) return;
  const client = qstash();
  if (!client) return;
  try {
    await client.messages.delete(messageId);
  } catch {}
}

export async function cancelScheduledPush(userId, kind, refId) {
  const row = await prisma.scheduledPush.findUnique({
    where: { userId_kind_refId: { userId, kind, refId } },
  }).catch(() => null);
  if (!row) return;
  await cancelQstashMessage(row.messageId);
  await prisma.scheduledPush.delete({ where: { id: row.id } }).catch(() => {});
}

export async function cancelScheduledPushes(userId, kind, refIds) {
  if (!refIds?.length) return;
  const rows = await prisma.scheduledPush.findMany({
    where: { userId, kind, refId: { in: refIds } },
  });
  await Promise.all(rows.map((row) => cancelQstashMessage(row.messageId)));
  await prisma.scheduledPush.deleteMany({
    where: { userId, kind, refId: { in: refIds } },
  }).catch(() => {});
}

/**
 * Create (or replace) a delayed QStash job that hits /api/push/send.
 */
export async function schedulePush({ userId, kind, refId, fireAtMs, title, body, url, tag }) {
  const client = qstash();
  if (!client || !userId || !kind || !refId || !fireAtMs) {
    return { ok: false, reason: 'not_configured' };
  }

  const delaySec = Math.floor((fireAtMs - Date.now()) / 1000);
  if (delaySec < 5) return { ok: false, reason: 'too_soon' };
  if (delaySec > QSTASH_MAX_DELAY_SEC) return { ok: false, reason: 'too_far' };

  const existing = await prisma.scheduledPush.findUnique({
    where: { userId_kind_refId: { userId, kind, refId } },
  }).catch(() => null);

  if (existing?.notBefore && Math.abs(new Date(existing.notBefore).getTime() - fireAtMs) < 30000) {
    return { ok: true, reused: true, messageId: existing.messageId };
  }

  if (existing) {
    await cancelQstashMessage(existing.messageId);
  }

  const destination = `${siteUrl()}/api/push/send`;
  const published = await client.publishJSON({
    url: destination,
    delay: delaySec,
    body: {
      userId,
      title: title || 'bokra',
      body: body || '',
      url: url || '/',
      tag: tag || `${kind}:${refId}`,
      kind,
      refId,
    },
  });

  const messageId = published?.messageId;
  if (!messageId) return { ok: false, reason: 'no_message_id' };

  await prisma.scheduledPush.upsert({
    where: { userId_kind_refId: { userId, kind, refId } },
    create: {
      userId,
      kind,
      refId,
      messageId,
      notBefore: new Date(fireAtMs),
    },
    update: {
      messageId,
      notBefore: new Date(fireAtMs),
    },
  });

  return { ok: true, messageId };
}

const LECTURE_CATEGORIES = new Set(['lecture', 'meeting', 'exam']);

export function isLectureLike(habit) {
  const cat = String(habit?.category || '').toLowerCase();
  return LECTURE_CATEGORIES.has(cat);
}

export async function reconcileLecturePushes(userId, timezone) {
  const habits = await prisma.habit.findMany({
    where: { userId, time: { not: null } },
    select: {
      id: true,
      name: true,
      time: true,
      category: true,
      frequency: true,
      scheduleDays: true,
      scheduleDate: true,
      notifyBefore: true,
    },
  });

  const lectures = habits.filter(isLectureLike);
  const keepIds = new Set(lectures.map((h) => h.id));
  const stale = await prisma.scheduledPush.findMany({
    where: { userId, kind: 'lecture' },
  });
  const staleIds = stale.filter((row) => !keepIds.has(row.refId)).map((row) => row.refId);
  if (staleIds.length) await cancelScheduledPushes(userId, 'lecture', staleIds);

  await Promise.all(lectures.map(async (habit) => {
    const fireAtMs = nextLectureFireAt(habit, timezone);
    if (!fireAtMs) {
      await cancelScheduledPush(userId, 'lecture', habit.id);
      return;
    }
    await schedulePush({
      userId,
      kind: 'lecture',
      refId: habit.id,
      fireAtMs,
      title: 'Lecture reminder',
      body: habit.time ? `${habit.name} at ${habit.time}` : habit.name,
      url: '/',
      tag: `lecture:${habit.id}`,
    }).catch(() => {});
  }));
}

export async function schedulePomodoroEnd(userId, endTimeSec) {
  const fireAtMs = Number(endTimeSec) * 1000;
  if (!fireAtMs || fireAtMs <= Date.now() + 5000) {
    await cancelScheduledPush(userId, 'pomodoro', 'active');
    return { ok: false };
  }
  return schedulePush({
    userId,
    kind: 'pomodoro',
    refId: 'active',
    fireAtMs,
    title: 'Focus session ended',
    body: 'Your Pomodoro timer finished.',
    url: '/',
    tag: 'pomodoro-end',
  });
}

export async function cancelPomodoroPush(userId) {
  return cancelScheduledPush(userId, 'pomodoro', 'active');
}
