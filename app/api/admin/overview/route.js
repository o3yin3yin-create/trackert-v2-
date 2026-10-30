import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth-server';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(req) {
  const userId = await getAuthUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const caller = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!caller || !caller.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const nowMs = Date.now();

    // 1. Core database aggregates in parallel
    const [
      totalUsers,
      totalHabits,
      habitsList,
      dailyLogs,
      friendships,
      rawActiveUsers,
      spotifyUsersCount
    ] = await Promise.all([
      prisma.user.count(),
      prisma.habit.count(),
      prisma.habit.findMany({ select: { category: true, isPrivate: true } }),
      prisma.dailyLog.findMany({
        select: { date: true, focusTime: true, logs: true, userId: true },
        orderBy: { date: 'desc' }
      }),
      prisma.friendship.findMany({
        select: { status: true, togetherSeconds: true }
      }),
      prisma.user.findMany({
        where: { activeSessionType: { not: null } },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          avatar: true,
          activeSessionType: true,
          activeSessionData: true,
          updatedAt: true
        }
      }),
      prisma.user.count({ where: { hasSpotifyAccess: true } })
    ]);

    // Filter live active users by checking if flight is still in progress or session is fresh
    const liveActiveUsers = rawActiveUsers.filter(u => {
      if (u.activeSessionType === 'flight') {
        const flightData = u.activeSessionData?.flight;
        if (flightData?.estimatedArrival && (flightData.estimatedArrival * 1000) > nowMs) {
          return true;
        }
        return (nowMs - new Date(u.updatedAt).getTime()) < 2 * 3600 * 1000;
      }
      return (nowMs - new Date(u.updatedAt).getTime()) < 2 * 3600 * 1000;
    });

    // 2. Compute focus hours, habit completion counts, and per-user focus
    let totalFocusSeconds = 0;
    let totalHabitCompletions = 0;
    const userFocusMap = {};
    const dateMetricsMap = {};

    for (const log of dailyLogs) {
      const focusSec = log.focusTime || 0;
      totalFocusSeconds += focusSec;
      userFocusMap[log.userId] = (userFocusMap[log.userId] || 0) + focusSec;

      let logCompletions = 0;
      if (log.logs && typeof log.logs === 'object') {
        logCompletions = Object.keys(log.logs).length;
        totalHabitCompletions += logCompletions;
      }

      if (!dateMetricsMap[log.date]) {
        dateMetricsMap[log.date] = {
          date: log.date,
          focusMinutes: 0,
          activeUsers: new Set(),
          completions: 0
        };
      }
      dateMetricsMap[log.date].focusMinutes += Math.round(focusSec / 60);
      dateMetricsMap[log.date].activeUsers.add(log.userId);
      dateMetricsMap[log.date].completions += logCompletions;
    }

    // 3. Build last 7 days trend
    const recent7Days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const isoDate = d.toISOString().split('T')[0];
      const entry = dateMetricsMap[isoDate];
      recent7Days.push({
        date: isoDate,
        focusMinutes: entry ? entry.focusMinutes : 0,
        activeUsersCount: entry ? entry.activeUsers.size : 0,
        completions: entry ? entry.completions : 0
      });
    }

    // 4. Category breakdown
    const categoryCounts = {};
    for (const h of habitsList) {
      const cat = h.category || 'habit';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }

    // 5. Accepted friendships & shared focus
    const acceptedFriendships = friendships.filter(f => f.status === 'accepted');
    const totalSharedSeconds = acceptedFriendships.reduce((acc, f) => acc + (f.togetherSeconds || 0), 0);

    // 6. Top focus users
    const topUserIds = Object.entries(userFocusMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([uid]) => uid);

    const topUsersProfiles = await prisma.user.findMany({
      where: { id: { in: topUserIds } },
      select: { id: true, name: true, username: true, email: true, avatar: true }
    });

    const topUsers = topUsersProfiles.map(u => ({
      ...u,
      focusHours: Math.round(((userFocusMap[u.id] || 0) / 3600) * 10) / 10
    })).sort((a, b) => b.focusHours - a.focusHours);

    return NextResponse.json({
      overview: {
        totalUsers,
        totalHabitsConfigured: totalHabits,
        totalHabitCompletions,
        totalDailyLogs: dailyLogs.length,
        totalFocusHours: Math.round((totalFocusSeconds / 3600) * 10) / 10,
        activeNowCount: liveActiveUsers.length,
        totalFriendships: acceptedFriendships.length,
        totalSharedFocusHours: Math.round((totalSharedSeconds / 3600) * 10) / 10,
        spotifyUsersCount,
        categoryCounts,
        recent7Days,
        liveActiveUsers,
        topUsers
      }
    });
  } catch (error) {
    console.error('Admin Overview GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
