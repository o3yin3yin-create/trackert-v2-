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
      totalHabitsCompleted,
      usersWithFocusTime
    ] = await Promise.all([
      prisma.user.count(),
      prisma.studyGroup.count(),
      prisma.friendship.count(),
      prisma.habit.count({ where: { completedToday: true } }),
      prisma.user.findMany({ select: { focusTime: true } })
    ]);

    const totalFocusTime = usersWithFocusTime.reduce((acc, user) => acc + (user.focusTime || 0), 0);

    return NextResponse.json({
      overview: {
        totalUsers,
        totalGroups,
        totalFriendships,
        totalHabitsCompleted,
        totalFocusTime
      }
    });
  } catch (error) {
    console.error('Admin Overview GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
