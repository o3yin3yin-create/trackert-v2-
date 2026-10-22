import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';
import { getAuthUserId } from '@/lib/auth-server';

const prisma = new PrismaClient();

function getCorsHeaders(req) {
  const origin = req?.headers?.get('origin');
  const headers = {
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
  };
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  return headers;
}

export async function OPTIONS(req) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...getCorsHeaders(req),
      'Access-Control-Max-Age': '86400',
    }
  });
}

// Fetch the complete state for the user
export async function GET(req) {
  const userId = await getAuthUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getCorsHeaders(req) });

  try {
    const url = new URL(req.url);
    const sinceParam = url.searchParams.get('since');
    const sinceTimestamp = sinceParam ? parseInt(sinceParam, 10) : null;

    if (sinceTimestamp && !isNaN(sinceTimestamp)) {
      const userMeta = await prisma.user.findUnique({
        where: { id: userId },
        select: { updatedAt: true, isBlocked: true }
      });

      if (userMeta?.isBlocked) {
        return NextResponse.json({ error: 'ACCOUNT_BLOCKED' }, { status: 403, headers: getCorsHeaders(req) });
      }

      if (userMeta?.updatedAt) {
        const serverTime = new Date(userMeta.updatedAt).getTime();
        // Strict match: only skip full state if client already has this exact server revision
        if (serverTime === sinceTimestamp) {
          return NextResponse.json({ unchanged: true, updatedAt: serverTime }, { headers: getCorsHeaders(req) });
        }
      }
    }

    let user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        habits: {
          orderBy: { createdAt: 'asc' }
        },
        dailyLogs: true,
      },
    });

    if (user?.isBlocked) {
      return NextResponse.json({ error: 'ACCOUNT_BLOCKED' }, { status: 403, headers: getCorsHeaders(req) });
    }

    if (!user) {
      // First time user, create default record
      const clerkUser = await currentUser();
      const name = clerkUser?.firstName ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim() : 'Unknown';
      const email = clerkUser?.emailAddresses?.[0]?.emailAddress || userId;

      user = await prisma.user.create({
        data: { id: userId, email, name }, // clerk usually provides email, but ID is what matters for foreign keys
        include: { habits: { orderBy: { createdAt: 'asc' } }, dailyLogs: true }
      });
    } else if (user.name === 'Zain' || user.email.startsWith('user_')) {
      const clerkUser = await currentUser();
      if (clerkUser) {
        const name = clerkUser.firstName ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim() : 'Unknown';
        const email = clerkUser.emailAddresses?.[0]?.emailAddress || userId;
        user = await prisma.user.update({
          where: { id: userId },
          data: { name, email },
          include: { habits: { orderBy: { createdAt: 'asc' } }, dailyLogs: true }
        });
      }
    }

    // Filter out any habits in _deletedHabits tombstone
    const deletedHabitsList = (user.grantedCards && typeof user.grantedCards === 'object' && Array.isArray(user.grantedCards._deletedHabits))
      ? user.grantedCards._deletedHabits
      : [];
    const deletedHabitsSet = new Set(deletedHabitsList);

    // Also: If _habitOrder is set, any habit in user.habits that was excluded from _habitOrder should be treated as deleted
    const habitOrder = (user.grantedCards && typeof user.grantedCards === 'object' && Array.isArray(user.grantedCards._habitOrder))
      ? user.grantedCards._habitOrder
      : null;

    if (habitOrder && habitOrder.length > 0) {
      const orderSet = new Set(habitOrder);
      for (const h of user.habits || []) {
        if (!orderSet.has(h.id)) {
          deletedHabitsSet.add(h.id);
        }
      }
    }

    if (deletedHabitsSet.size > 0) {
      // Clean up deleted habits from DB in background
      prisma.habit.deleteMany({
        where: { userId, id: { in: Array.from(deletedHabitsSet) } }
      }).catch(() => {});
    }

    // Filter out deleted habits and sort according to user's saved _habitOrder or fallback to createdAt
    let sortedHabits = (user.habits || []).filter(h => !deletedHabitsSet.has(h.id));

    if (habitOrder && habitOrder.length > 0) {
      const orderMap = new Map(habitOrder.map((id, idx) => [id, idx]));
      sortedHabits.sort((a, b) => {
        const idxA = orderMap.has(a.id) ? orderMap.get(a.id) : 9999;
        const idxB = orderMap.has(b.id) ? orderMap.get(b.id) : 9999;
        if (idxA !== idxB) return idxA - idxB;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
    } else {
      sortedHabits.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }

    // Reconstruct the flat state object expected by the frontend
    const state = {
      theme: user.theme,
      bgStyle: user.bgStyle,
      lang: user.lang,
      themeColor: user.themeColor,
      avatar: user.avatar || 'boy1',
      isAdmin: user.isAdmin,
      isBlocked: user.isBlocked,
      mission: (user.grantedCards && typeof user.grantedCards === 'object' && user.grantedCards._mission) || "",
      emergencyCards: user.emergencyCards || [],
      grantedCardsLog: user.grantedCards || {},
      finishedTickets: user.finishedTickets || [],
      habits: sortedHabits,
      dailyData: {},
      sleepData: {},
      focusTimeData: {},
      pomodoroTasksData: {},
      activeSessionType: user.activeSessionType,
      activeSessionData: user.activeSessionData,
      updatedAt: user.updatedAt ? new Date(user.updatedAt).getTime() : Date.now(),
    };

    // Unpack daily logs into their respective maps
    user.dailyLogs.forEach(log => {
      // dailyData is merged directly
      if (log.logs && typeof log.logs === 'object') {
        Object.assign(state.dailyData, log.logs);
      }
      
      if (log.sleep) {
        state.sleepData[log.date] = log.sleep;
      }
      
      if (log.focusTime) {
        state.focusTimeData[log.date] = log.focusTime;
      }
      
      if (log.tasks && Array.isArray(log.tasks)) {
        state.pomodoroTasksData[log.date] = log.tasks;
      }
    });

    return NextResponse.json({ state }, { headers: getCorsHeaders(req) });

  } catch (error) {
    console.error('Sync GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: getCorsHeaders(req) });
  }
}

// Save the complete state to the database
export async function POST(req) {
  const userId = await getAuthUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getCorsHeaders(req) });

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { habits: true }
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404, headers: getCorsHeaders(req) });
    }
    if (user.isBlocked) {
      return NextResponse.json({ error: 'ACCOUNT_BLOCKED' }, { status: 403, headers: getCorsHeaders(req) });
    }

    const state = await req.json();

    const existingGranted = (user.grantedCards && typeof user.grantedCards === 'object') ? user.grantedCards : {};
    const newGranted = (state.grantedCardsLog && typeof state.grantedCardsLog === 'object') 
      ? { ...existingGranted, ...state.grantedCardsLog }
      : { ...existingGranted };
    if (state.mission !== undefined && state.mission !== null) {
      newGranted._mission = state.mission;
    }

    // 1. Maintain persistent Tombstones (_deletedHabits) in user metadata
    const existingDeleted = (existingGranted._deletedHabits && Array.isArray(existingGranted._deletedHabits))
      ? existingGranted._deletedHabits
      : [];
    const deletedHabitsSet = new Set(existingDeleted);

    if (Array.isArray(state.deletedHabitIds)) {
      for (const id of state.deletedHabitIds) {
        if (id) deletedHabitsSet.add(id);
      }
    }

    // Filter incoming state.habits against deletedHabitsSet to strictly prevent resurrection of deleted habits
    const activeStateHabits = Array.isArray(state.habits)
      ? state.habits.filter(h => h && h.id && !deletedHabitsSet.has(h.id))
      : [];

    newGranted._habitOrder = activeStateHabits.map(h => h.id);
    newGranted._deletedHabits = Array.from(deletedHabitsSet);

    // 2. Delete habits from database
    if (deletedHabitsSet.size > 0) {
      await prisma.habit.deleteMany({
        where: { userId, id: { in: Array.from(deletedHabitsSet) } }
      });
    }

    // 3. Upsert User Settings
    await prisma.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        email: userId,
        theme: state.theme || 'dark',
        bgStyle: state.bgStyle || 'aurora',
        lang: state.lang || 'en',
        themeColor: state.themeColor || '#FF9F0A',
        avatar: state.avatar || 'boy1',
        emergencyCards: state.emergencyCards || [],
        grantedCards: newGranted,
        finishedTickets: state.finishedTickets || [],
        activeSessionType: state.activeSessionType || null,
        activeSessionData: state.activeSessionData || null,
      },
      update: {
        theme: state.theme,
        bgStyle: state.bgStyle,
        lang: state.lang,
        themeColor: state.themeColor,
        emergencyCards: state.emergencyCards || [],
        grantedCards: newGranted,
        finishedTickets: state.finishedTickets || [],
        updatedAt: new Date(),
        ...(state.activeSessionType !== undefined && { activeSessionType: state.activeSessionType }),
        ...(state.activeSessionData !== undefined && { activeSessionData: state.activeSessionData }),
      }
    });

    // 4. Sync Habits (Upsert only active non-deleted habits)
    if (activeStateHabits.length > 0) {
      const existingHabitsMap = new Map((user.habits || []).map(h => [h.id, h]));
      const habitsToUpsert = [];

      for (const h of activeStateHabits) {
        if (!h.id || !h.name) continue;
        const ex = existingHabitsMap.get(h.id);
        const subItemsMatch = ex && JSON.stringify(ex.subItems || []) === JSON.stringify(h.subItems || []);
        const hasChanged = !ex || 
          ex.name !== h.name || 
          ex.type !== (h.type || 'single') || 
          !subItemsMatch || 
          ex.isNotifyEnabled !== (h.isNotifyEnabled || false) || 
          ex.notifyTime !== (h.notifyTime || null) || 
          ex.customMessage !== (h.customMessage || null);

        if (hasChanged) {
          habitsToUpsert.push(h);
        }
      }

      for (const h of habitsToUpsert) {
        await prisma.habit.upsert({
          where: { id: h.id },
          create: {
            id: h.id,
            name: h.name,
            type: h.type || 'single',
            subItems: h.subItems || [],
            isNotifyEnabled: h.isNotifyEnabled || false,
            notifyTime: h.notifyTime,
            customMessage: h.customMessage,
            userId
          },
          update: {
            name: h.name,
            type: h.type || 'single',
            subItems: h.subItems || [],
            isNotifyEnabled: h.isNotifyEnabled || false,
            notifyTime: h.notifyTime,
            customMessage: h.customMessage,
          }
        });
      }
    }

    // 3. Sync Daily Logs — ONLY FOR TODAY AND YESTERDAY (no querying all days)
    const now = new Date();
    const todayStr = (state.activeDateStr && state.activeDateStr.length === 10) 
      ? state.activeDateStr 
      : now.toISOString().substring(0, 10);
    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().substring(0, 10);

    const allowedDates = new Set([
      todayStr,
      yesterdayStr,
      ...(Array.isArray(state.targetDates) ? state.targetDates : [])
    ]);
    const targetDatesArray = Array.from(allowedDates).filter(d => typeof d === 'string' && d.length === 10);

    // Query ONLY today and yesterday from database (max 2 rows)
    const existingDailyLogs = await prisma.dailyLog.findMany({
      where: {
        userId,
        date: { in: targetDatesArray }
      }
    });
    const existingLogsMap = new Map(existingDailyLogs.map(l => [l.date, l]));

    for (const date of targetDatesArray) {
      const dateDailyData = {};
      for (const [k, v] of Object.entries(state.dailyData || {})) {
        if (k.startsWith(date)) {
          dateDailyData[k] = v;
        }
      }

      const existingDailyLog = existingLogsMap.get(date);
      const existingLogs = (existingDailyLog?.logs && typeof existingDailyLog.logs === 'object')
        ? existingDailyLog.logs
        : {};

      const mergedLogs = {
        ...existingLogs,
        ...dateDailyData
      };

      const existingTasks = (existingDailyLog?.tasks && Array.isArray(existingDailyLog.tasks))
        ? existingDailyLog.tasks
        : [];
      const clientTasks = state.pomodoroTasksData?.[date];
      const mergedTasks = (Array.isArray(clientTasks) && clientTasks.length > 0)
        ? clientTasks
        : existingTasks;

      const clientSleep = state.sleepData?.[date];
      const sleepVal = clientSleep !== undefined ? clientSleep : (existingDailyLog?.sleep || null);

      const clientFocus = state.focusTimeData?.[date] || 0;
      const existingFocus = existingDailyLog?.focusTime || 0;
      const focusVal = Math.max(clientFocus, existingFocus);

      await prisma.dailyLog.upsert({
        where: { userId_date: { userId, date } },
        create: {
          userId,
          date,
          logs: mergedLogs,
          sleep: sleepVal,
          focusTime: focusVal,
          tasks: mergedTasks,
        },
        update: {
          logs: mergedLogs,
          sleep: sleepVal,
          focusTime: focusVal,
          tasks: mergedTasks,
        }
      });
    }

    const finalUser = await prisma.user.update({
      where: { id: userId },
      data: { updatedAt: new Date() },
      select: { updatedAt: true }
    });
    const finalUpdatedAt = new Date(finalUser.updatedAt).getTime();
    return NextResponse.json({ success: true, updatedAt: finalUpdatedAt }, { headers: getCorsHeaders(req) });

  } catch (error) {
    console.error('Sync POST Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: getCorsHeaders(req) });
  }
}
