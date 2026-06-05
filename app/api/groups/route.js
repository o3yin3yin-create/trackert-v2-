import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';

const prisma = new PrismaClient();

function calculateHabitsCompleted(logsJson) {
  if (!logsJson) return 0;
  try {
    let completed = 0;
    for (const key in logsJson) {
      if (logsJson[key]) completed++;
    }
    return completed;
  } catch (e) {
    return 0;
  }
}

export async function GET(req) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().substring(0, 10);

    // Get user's groups with all members and their stats
    const userGroups = await prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            members: {
              include: {
                user: { select: { id: true, name: true, friendCode: true, _count: { select: { habits: true } } } }
              }
            }
          }
        }
      }
    });

    const groupsList = [];

    for (const ug of userGroups) {
      const g = ug.group;
      const membersStats = [];
      
      for (const m of g.members) {
        const u = m.user;
        const dailyLog = await prisma.dailyLog.findUnique({
          where: { userId_date: { userId: u.id, date } }
        });

        membersStats.push({
          id: u.id,
          name: u.name,
          friendCode: u.friendCode,
          focusTime: dailyLog?.focusTime || 0,
          habitsCompleted: calculateHabitsCompleted(dailyLog?.logs),
          habitsTotal: u._count?.habits || 0,
        });
      }

      groupsList.push({
        id: g.id,
        code: g.code,
        name: g.name,
        members: membersStats
      });
    }

    return NextResponse.json({ groups: groupsList });

  } catch (error) {
    console.error('Groups GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
  }
}
