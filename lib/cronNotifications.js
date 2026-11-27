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

export const NOTIFICATION_CATALOG = [
  {
    id: 'morning_wakeup',
    name: 'Daily Good Morning',
    schedule: 'User wake-up time (default 08:00 AM, user local timezone)',
    title: 'Good Morning',
    body: 'Rise and shine! Open bokra to plan your day and lock in your mission.',
    channel: 'Server Cron (Every 1 min)',
  },
  {
    id: 'birthday_wish',
    name: 'Birthday Celebration',
    schedule: 'User birthday (MM-DD) at 09:00 AM (user local timezone)',
    title: 'Happy Birthday, {name}!',
    body: 'Wishing you an amazing year ahead filled with focus, growth, and wins. — bokra',
    channel: 'Server Cron (Every 1 min)',
  },
  {
    id: 'athkar_morning',
    name: 'Morning Athkar',
    schedule: 'Daily at 07:00 AM (user local timezone)',
    title: 'Morning Athkar',
    body: 'Time for Morning Athkar. Start your day with peaceful remembrance.',
    channel: 'Server Cron (Every 1 min)',
  },
  {
    id: 'athkar_evening',
    name: 'Evening Athkar',
    schedule: 'Daily at 05:00 PM (user local timezone)',
    title: 'Evening Athkar',
    body: 'Time for Evening Athkar. End your day with peaceful remembrance.',
    channel: 'Server Cron (Every 1 min)',
  },
  {
    id: 'habit_reminder',
    name: 'Habit & Lecture Reminders',
    schedule: 'Habit notifyTime minus notifyBefore (user local timezone)',
    title: 'bokra',
    body: 'Habit reminder: {habit.name}',
    channel: 'Server Cron + ScheduledPush',
  },
  {
    id: 'deep_flow_checkin',
    name: 'Deep Flow 4-Hour Check-In',
    schedule: 'Every 4 hours during active Deep Flow (auto-closes after 5m if unconfirmed)',
    title: 'Are you still here?',
    body: 'Deep Flow has been running for 4 hours. Confirm within 5 minutes or it will close automatically.',
    channel: 'Local + ScheduledPush',
  },
  {
    id: 'pomodoro_complete',
    name: 'Pomodoro Session Complete',
    schedule: 'When Pomodoro timer reaches 00:00',
    title: 'Focus session complete',
    body: 'Great job! Your focus time is done, take a well-deserved break.',
    channel: 'Local + ScheduledPush',
  },
];

/**
 * Evaluate due habit reminders, Athkar alerts, daily Good Morning wake-ups,
 * and locally-scheduled pushes in each user's local timezone.
 */
export async function runCronNotifications() {
  const now = new Date();
  const nowMs = now.getTime();
  let sentCount = 0;

  // 1. Daily Good Morning Wake-Up & Birthday Notifications
  const pushUsers = await prisma.user.findMany({
    where: { pushTokens: { some: {} } },
    select: { id: true, name: true, timezone: true, privacySettings: true },
  });

  for (const u of pushUsers) {
    const prefs = (u.privacySettings && typeof u.privacySettings === 'object') ? u.privacySettings : {};
    const tz = u.timezone || 'Africa/Cairo';
    const { year, month, day } = ymdInZone(now, tz);
    const { hour, minute } = getLocalHourMinute(now, tz);

    if (prefs.morningNotifyEnabled !== false) {
      const wakeStr = typeof prefs.morningNotifyTime === 'string' && /^\d{2}:\d{2}$/.test(prefs.morningNotifyTime)
        ? prefs.morningNotifyTime
        : '08:00';
      const [wakeHour, wakeMin] = wakeStr.split(':').map(Number);

      if (hour === wakeHour && minute === wakeMin) {
        if (markSentOnce(`morning:${u.id}:${year}-${month}-${day}`)) {
          const res = await sendPush(u.id, {
            title: 'Good Morning',
            body: 'Rise and shine! Open bokra to plan your day and lock in your mission.',
            url: '/',
            tag: 'morning_wakeup',
          }).catch(() => ({ sent: 0 }));
          sentCount += res?.sent || 0;
        }
      }
    }

    // Birthday Wish at 09:00 AM local time on user's birthday (YYYY-MM-DD)
    if (typeof prefs.birthday === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(prefs.birthday)) {
      const [, bMonth, bDay] = prefs.birthday.split('-').map(Number);
      if (month === bMonth && day === bDay && hour === 9 && minute === 0) {
        if (markSentOnce(`birthday:${u.id}:${year}`)) {
          const firstName = u.name ? String(u.name).trim().split(/\s+/)[0] : '';
          const res = await sendPush(u.id, {
            title: firstName ? `Happy Birthday, ${firstName}!` : 'Happy Birthday!',
            body: 'Wishing you an amazing year ahead filled with focus, growth, and wins. — bokra',
            url: '/',
            tag: `birthday_${year}`,
          }).catch(() => ({ sent: 0 }));
          sentCount += res?.sent || 0;
        }
      }
    }
  }

  // 2. Due Habit Reminders (in each user's timezone)
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
    const tz = habit.user?.timezone || 'Africa/Cairo';
    const { year, month, day, dow } = ymdInZone(now, tz);
    if (!isHabitOnDate(habit, year, month, day, dow)) continue;

    // 2a. Repeating Interval Reminders throughout the day (e.g. EVERY_60M during daytime 08:00-23:00)
    const everyMatch = typeof habit.notifyTime === 'string' ? habit.notifyTime.match(/^EVERY_(\d+)M$/i) : null;
    if (everyMatch) {
      const intervalMins = parseInt(everyMatch[1], 10);
      if (intervalMins > 0) {
        const { hour, minute } = getLocalHourMinute(now, tz);
        // Active daytime window: 08:00 AM to 11:00 PM (23:00) local time
        if (hour >= 8 && hour <= 23) {
          const minsSince8am = (hour - 8) * 60 + minute;
          if (minsSince8am > 0 && minsSince8am % intervalMins === 0) {
            const slotKey = `repeat_habit:${habit.id}:${year}-${month}-${day}:${minsSince8am}`;
            if (markSentOnce(slotKey)) {
              const res = await sendPush(habit.userId, {
                title: `Reminder: ${habit.name}`,
                body: habit.customMessage || `Time for ${habit.name} (every ${intervalMins >= 60 && intervalMins % 60 === 0 ? `${intervalMins / 60}h` : `${intervalMins}m`})`,
                url: '/',
                tag: `repeat:${habit.id}`,
              }).catch(() => ({ sent: 0 }));
              sentCount += res?.sent || 0;
            }
          }
        }
      }
      continue;
    }

    // 2b. Specific One-Time Clock Reminder
    const clock = parseClock(habit.notifyTime);
    if (!clock) continue;

    const eventMs = zonedLocalToUtcMs(year, month, day, clock.hour, clock.minute, tz);
    const notifyBeforeMins = Number.isFinite(habit.notifyBefore) ? habit.notifyBefore : 0;
    const targetNotifyMs = eventMs - notifyBeforeMins * 60 * 1000;

    if (Math.abs(nowMs - targetNotifyMs) <= 45 * 1000) {
      const minuteBucket = Math.floor(targetNotifyMs / 60000);
      if (!markSentOnce(`habit:${habit.id}:${minuteBucket}`)) continue;

      const res = await sendPush(habit.userId, {
        title: `Reminder: ${habit.name}`,
        body: habit.customMessage || `Habit reminder: ${habit.name}`,
        url: '/',
        tag: `habit:${habit.id}`,
      }).catch(() => ({ sent: 0 }));
      sentCount += res?.sent || 0;
    }
  }

  // 3. Athkar Reminders at 07:00 and 17:00 in each user's timezone (English)
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

      const title = hour === 7 ? 'Morning Athkar' : 'Evening Athkar';
      const body =
        hour === 7
          ? 'Time for Morning Athkar. Start your day with peaceful remembrance.'
          : 'Time for Evening Athkar. End your day with peaceful remembrance.';

      const res = await sendPush(habit.userId, {
        title,
        body,
        url: '/',
        tag: `adhkar:${hour}`,
      }).catch(() => ({ sent: 0 }));
      sentCount += res?.sent || 0;
    }
  }

  // 4. Locally-scheduled pushes (when QStash is not configured, e.g. Render)
  const dueLocalPushes = await prisma.scheduledPush.findMany({
    where: {
      messageId: 'local',
      notBefore: { lte: now },
    },
  });

  for (const job of dueLocalPushes) {
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
      body = 'Great job! Your focus time is done, take a well-deserved break.';
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
