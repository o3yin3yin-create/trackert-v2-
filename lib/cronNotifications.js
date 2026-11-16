import prisma from '@/lib/prisma';
import { sendPush } from '@/lib/push';
import {
  parseClock,
  zonedLocalToUtcMs,
  ymdInZone,
  isHabitOnDate,
} from '@/lib/pushSchedule';

const sentKeys = new Set();

function markSentOnce(key) {
  if (sentKeys.has(key)) return false;
  if (sentKeys.size > 5000) sentKeys.clear();
  sentKeys.add(key);
  return true;
}

function getLocalHourMinute(date, timeZone) {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      hour: 'numeric',
      minute: 'numeric',
    });
    const parts = {};
    for (const p of dtf.formatToParts(date)) {
      if (p.type !== 'literal') parts[p.type] = p.value;
    }
    const hour = Number(parts.hour) === 24 ? 0 : Number(parts.hour);
    const minute = Number(parts.minute);
    return { hour, minute };
  } catch {
    return { hour: date.getUTCHours(), minute: date.getUTCMinutes() };
  }
}

/**
 * Evaluate due habit reminders, Athkar alerts, and locally-scheduled pushes
 * in each user's local timezone and dispatch via multi-device FCM.
 */
export async function runCronNotifications() {
  const now = new Date();
  const nowMs = now.getTime();
  let sentCount = 0;

  // 1. Due Habit Reminders (in each user's timezone)
  const habitsWithNotifications = await prisma.habit.findMany({
    where: {
      isNotifyEnabled: true,
      notifyTime: { not: null },
    },
    include: {
      user: { select: { id: true, timezone: true } },
    },
  });

  for (const habit of habitsWithNotifications) {
    const clock = parseClock(habit.notifyTime);
    if (!clock) continue;

    const tz = habit.user?.timezone || 'Africa/Cairo';
    const { year, month, day, dow } = ymdInZone(now, tz);
    if (!isHabitOnDate(habit, year, month, day, dow)) continue;

    const eventMs = zonedLocalToUtcMs(year, month, day, clock.hour, clock.minute, tz);
    const notifyBeforeMins = Number.isFinite(habit.notifyBefore) ? habit.notifyBefore : 0;
    const targetNotifyMs = eventMs - notifyBeforeMins * 60 * 1000;

    if (Math.abs(nowMs - targetNotifyMs) <= 45 * 1000) {
      const minuteBucket = Math.floor(targetNotifyMs / 60000);
      if (!markSentOnce(`habit:${habit.id}:${minuteBucket}`)) continue;

      const res = await sendPush(habit.userId, {
        title: 'bokra',
        body: `Habit reminder: ${habit.name}`,
        url: '/',
        tag: `habit:${habit.id}`,
      }).catch(() => ({ sent: 0 }));
      sentCount += res?.sent || 0;
    }
  }

  // 2. Athkar Reminders at 07:00 and 17:00 in each user's timezone
  const athkarHabits = await prisma.habit.findMany({
    where: {
      OR: [
        { category: 'adhkar' },
        { id: 'adhkar' },
        { name: { contains: 'أذكار' } },
        { name: { contains: 'adhkar', mode: 'insensitive' } },
      ],
    },
    include: {
      user: { select: { id: true, timezone: true } },
    },
  });

  for (const habit of athkarHabits) {
    const tz = habit.user?.timezone || 'Africa/Cairo';
    const { year, month, day } = ymdInZone(now, tz);
    const { hour, minute } = getLocalHourMinute(now, tz);

    if ((hour === 7 || hour === 17) && minute === 0) {
      if (!markSentOnce(`adhkar:${habit.id}:${year}-${month}-${day}-${hour}`)) continue;

      const body =
        hour === 7
          ? 'أذكار الصباح ☀️: حان وقت أذكار الصباح، ابدأ يومك بذكر الله وحصّن نفسك.'
          : 'أذكار المساء 🌙: حان وقت أذكار المساء، حصّن نفسك واختم يومك بذكر الله.';

      const res = await sendPush(habit.userId, {
        title: 'bokra',
        body,
        url: '/',
        tag: `adhkar:${hour}`,
      }).catch(() => ({ sent: 0 }));
      sentCount += res?.sent || 0;
    }
  }

  // 3. Locally-scheduled pushes (when QStash is not configured, e.g. Render)
  const dueLocalPushes = await prisma.scheduledPush.findMany({
    where: {
      messageId: 'local',
      notBefore: { lte: now },
    },
  });

  for (const job of dueLocalPushes) {
    // Delete first so concurrent runs don't double-send
    const deleted = await prisma.scheduledPush
      .delete({ where: { id: job.id } })
      .catch(() => null);
    if (!deleted) continue;

    let title = 'bokra';
    let body = 'Time is up!';
    if (job.kind === 'flow') {
      title = 'Are you still here?';
      body = 'Deep Flow has been running for 4 hours. Confirm within 5 minutes or it will close automatically.';
    } else if (job.kind === 'pomodoro') {
      title = 'Focus session complete';
      body = 'Your Pomodoro timer finished.';
    } else if (job.kind === 'lecture') {
      const habit = await prisma.habit.findUnique({ where: { id: job.refId } }).catch(() => null);
      body = habit ? `Reminder: ${habit.name}` : 'Upcoming scheduled habit';
    }

    const res = await sendPush(job.userId, {
      title,
      body,
      url: '/',
      tag: `${job.kind}:${job.refId}`,
    }).catch(() => ({ sent: 0 }));
    sentCount += res?.sent || 0;
  }

  return { sentCount };
}
