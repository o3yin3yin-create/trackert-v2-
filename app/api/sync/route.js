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
        habits: true,
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
        include: { habits: true, dailyLogs: true }
      });
    } else if (user.name === 'Zain' || user.email.startsWith('user_')) {
      const clerkUser = await currentUser();
      if (clerkUser) {
        const name = clerkUser.firstName ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim() : 'Unknown';
        const email = clerkUser.emailAddresses?.[0]?.emailAddress || userId;
        user = await prisma.user.update({
          where: { id: userId },
          data: { name, email },
          include: { habits: true, dailyLogs: true }
        });
      }
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
      habits: user.habits,
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
    const user = await prisma.user.findUnique({ where: { id: userId } });
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

    // 1. Upsert User Settings
    const updatedUser = await prisma.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        email: userId, // We'll let GET populate email/name properly
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

    // 2. Sync Habits
    // Delete ONLY habits that the user explicitly chose to delete
    if (state.deletedHabitIds && Array.isArray(state.deletedHabitIds) && state.deletedHabitIds.length > 0) {
      await prisma.habit.deleteMany({
        where: { userId, id: { in: state.deletedHabitIds } }
      });
    }

    if (state.habits && Array.isArray(state.habits) && state.habits.length > 0) {
      // Upsert existing/new habits
      for (const h of state.habits) {
        if (!h.id || !h.name) continue;
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

    // 3. Sync Daily Logs
    // Extract unique dates from all data sources
    const dates = new Set([
      ...Object.keys(state.dailyData || {}).map(k => k.substring(0, 10)),
      ...Object.keys(state.sleepData || {}),
      ...Object.keys(state.focusTimeData || {}),
      ...Object.keys(state.pomodoroTasksData || {})
    ]);

    for (const date of dates) {
      if (!date || date.length !== 10) continue; // safety check

      // Filter incoming dailyData for this specific date
      const dateDailyData = {};
      for (const [k, v] of Object.entries(state.dailyData || {})) {
        if (k.startsWith(date)) {
          dateDailyData[k] = v;
        }
      }

      const existingDailyLog = await prisma.dailyLog.findUnique({
        where: { userId_date: { userId, date } }
      });

      const existingLogs = (existingDailyLog?.logs && typeof existingDailyLog.logs === 'object')
        ? existingDailyLog.logs
        : {};

      // Merge incoming checks into existing logs (preserves checks made from other devices)
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
