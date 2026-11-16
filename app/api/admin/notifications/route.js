import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth-server';
import prisma from '@/lib/prisma';
import { sendPush } from '@/lib/push';
import { NOTIFICATION_CATALOG } from '@/lib/cronNotifications';

export const runtime = 'nodejs';

async function requireAdmin(req) {
  const userId = await getAuthUserId(req);
  if (!userId) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const caller = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!caller || !caller.isAdmin) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { caller };
}

export async function GET(req) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  try {
    const [totalDevices, distinctUsers, activeHabitReminders, pendingScheduled, sampleHabits] = await Promise.all([
      prisma.pushToken.count(),
      prisma.pushToken.findMany({ select: { userId: true }, distinct: ['userId'] }),
      prisma.habit.count({ where: { isNotifyEnabled: true, notifyTime: { not: null } } }),
      prisma.scheduledPush.count(),
      prisma.habit.findMany({
        where: { isNotifyEnabled: true, notifyTime: { not: null } },
        take: 30,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          notifyTime: true,
          notifyBefore: true,
          frequency: true,
          user: { select: { name: true, email: true, timezone: true } },
        },
      }),
    ]);

    return NextResponse.json({
      catalog: NOTIFICATION_CATALOG,
      stats: {
        totalDevices,
        subscribedUsers: distinctUsers.length,
        activeHabitReminders,
        pendingScheduled,
      },
      sampleHabits,
    });
  } catch (err) {
    console.error('[Admin Notifications GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  try {
    const body = await req.json().catch(() => ({}));
    const title = typeof body.title === 'string' ? body.title.trim().slice(0, 120) : '';
    const message = typeof body.body === 'string' ? body.body.trim().slice(0, 300) : '';
    const url = typeof body.url === 'string' && body.url.trim() ? body.url.trim().slice(0, 200) : '/';

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message body are required' }, { status: 400 });
    }

    const recipients = await prisma.pushToken.findMany({
      select: { userId: true },
      distinct: ['userId'],
    });

    const tag = `broadcast_${Date.now()}`;
    let totalSent = 0;

    // Send in batches of 20 users
    for (let i = 0; i < recipients.length; i += 20) {
      const batch = recipients.slice(i, i + 20);
      const results = await Promise.all(
        batch.map((r) =>
          sendPush(r.userId, { title, body: message, url, tag }).catch(() => ({ sent: 0 }))
        )
      );
      totalSent += results.reduce((sum, r) => sum + (r?.sent || 0), 0);
    }

    return NextResponse.json({
      ok: true,
      usersTargeted: recipients.length,
      totalSent,
    });
  } catch (err) {
    console.error('[Admin Notifications POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
