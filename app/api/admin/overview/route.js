import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';

const prisma = new PrismaClient();

export async function GET(req) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const caller = await prisma.user.findUnique({ where: { id: userId } });
    if (!caller || !caller.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [
      totalUsers,
      totalGroups,
      totalFriendships,
      totalHabitsCreated,
      dailyLogsAggr
    ] = await Promise.all([
      prisma.user.count(),
      prisma.studyGroup.count(),
      prisma.friendship.count(),
      prisma.habit.count(),
      prisma.dailyLog.aggregate({ _sum: { focusTime: true } })
    ]);

    const totalFocusTime = dailyLogsAggr._sum.focusTime || 0;

    return NextResponse.json({
      overview: {
        totalUsers,
        totalGroups,
        totalFriendships,
        totalHabitsCompleted: totalHabitsCreated, // Reusing field name for compatibility, but it's actually total created
        totalFocusTime
      }
    });
  } catch (error) {
    console.error('Admin Overview GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
