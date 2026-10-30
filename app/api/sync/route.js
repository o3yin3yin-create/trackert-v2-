import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { getAuthUserId } from '@/lib/auth-server';
import { getCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { rateLimit, getClientIp } from '@/lib/rateLimit';

export async function OPTIONS(req) {
  return handleCorsOptions(req);
}

// Fetch the complete state for the user
export async function GET(req) {
  const ip = getClientIp(req);
  if (!await rateLimit(`sync-get-ip:${ip}`, 120, 60_000)) {
    return NextResponse.json({ error: 'Too many sync requests from this IP' }, { status: 429, headers: getCorsHeaders(req) });
  }

  const userId = await getAuthUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getCorsHeaders(req) });

  if (!await rateLimit(`sync-get:${userId}`, 120, 60_000)) {
    return NextResponse.json({ error: 'Too many sync requests' }, { status: 429, headers: getCorsHeaders(req) });
  }

  try {
    const url = new URL(req.url);
    const sinceParam = url.searchParams.get('since');
    const sinceTimestamp = sinceParam ? parseInt(sinceParam, 10) : null;

    if (sinceTimestamp && !isNaN(sinceTimestamp)) {
      const userMeta = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { id: true, updatedAt: true, isBlocked: true }
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
      where: { clerkId: userId },
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
      // First time user or returning user from dev with new production clerkId: link by email
      const clerkUser = await currentUser();
      const email = clerkUser?.emailAddresses?.[0]?.emailAddress || `${userId}@bokra.app`;
      const name = clerkUser?.firstName ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim() : 'Unknown';
      const username = clerkUser?.username || null;

      // Check if user already exists with this email in database (from dev mode)
      const existingUserByEmail = email && !email.endsWith('@bokra.app')
        ? await prisma.user.findUnique({
            where: { email },
            include: {
              habits: { orderBy: { createdAt: 'asc' } },
              dailyLogs: true,
            }
          })
        : null;

      if (existingUserByEmail) {
        // Seamlessly link existing dev user (and all their habits, daily logs, history) to new production clerkId
        user = await prisma.user.update({
          where: { id: existingUserByEmail.id },
          data: {
            clerkId: userId,
            name: name !== 'Unknown' ? name : existingUserByEmail.name,
            ...(username ? { username } : {}),
          },
          include: {
            habits: { orderBy: { createdAt: 'asc' } },
            dailyLogs: true,
          }
        });
      } else {
        user = await prisma.user.create({
          data: { clerkId: userId, email, name, ...(username ? { username } : {}) },
          include: { habits: { orderBy: { createdAt: 'asc' } }, dailyLogs: true }
        });
      }
    } else {
      const clerkUser = await currentUser();
      if (clerkUser) {
        const name = clerkUser.firstName ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim() : user.name;
        const email = clerkUser.emailAddresses?.[0]?.emailAddress || user.email;
        const username = clerkUser.username || null;

        if ((username && user.username !== username) || (user.name === 'Zain' || user.email.startsWith('user_'))) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { name, email, ...(username ? { username } : {}) },
            include: { habits: { orderBy: { createdAt: 'asc' } }, dailyLogs: true }
          });
        }
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
      username: user.username || null,
      theme: user.theme,
      bgStyle: user.bgStyle,
      lang: user.lang,
      themeColor: user.themeColor,
      avatar: user.avatar || 'user',
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
      spotifyRefreshToken: user.spotifyRefreshToken || null,
      hasSpotifyAccess: Boolean(user.hasSpotifyAccess),
      privacySettings: user.privacySettings || {},
      timezone: user.timezone || 'Africa/Cairo',
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
  const ip = getClientIp(req);
  if (!await rateLimit(`sync-post-ip:${ip}`, 60, 60_000)) {
    return NextResponse.json({ error: 'Too many sync updates from this IP. Please slow down.' }, { status: 429, headers: getCorsHeaders(req) });
  }

  const userId = await getAuthUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getCorsHeaders(req) });

  if (!await rateLimit(`sync-post:${userId}`, 60, 60_000)) {
    return NextResponse.json({ error: 'Too many sync updates. Please slow down.' }, { status: 429, headers: getCorsHeaders(req) });
  }

  try {
    let user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { habits: true }
    });
    if (!user) {
      const clerkUser = await currentUser();
      const email = clerkUser?.emailAddresses?.[0]?.emailAddress;
      if (email) {
        const existingUserByEmail = await prisma.user.findUnique({
          where: { email },
          include: { habits: true }
        });
        if (existingUserByEmail) {
          user = await prisma.user.update({
            where: { id: existingUserByEmail.id },
            data: { clerkId: userId },
            include: { habits: true }
          });
        }
      }
    }
    if (user?.isBlocked) {
      return NextResponse.json({ error: 'ACCOUNT_BLOCKED' }, { status: 403, headers: getCorsHeaders(req) });
    }

    const state = await req.json();

    const existingGranted = (user?.grantedCards && typeof user.grantedCards === 'object') ? user.grantedCards : {};
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

    // If user does not exist in DB yet, create user record first
    if (!user) {
      user = await prisma.user.create({
        data: {
          clerkId: userId,
          email: `${userId}@bokra.app`,
          theme: state.theme || 'dark',
          bgStyle: state.bgStyle || 'aurora',
          lang: state.lang || 'en',
          themeColor: state.themeColor || '#FF9F0A',
          avatar: state.avatar || 'user',
          emergencyCards: state.emergencyCards || [],
          grantedCards: newGranted,
          finishedTickets: state.finishedTickets || [],
          activeSessionType: state.activeSessionType || null,
          activeSessionData: state.activeSessionData || null,
          spotifyRefreshToken: state.spotifyRefreshToken || null,
          privacySettings: state.privacySettings || {},
        },
        include: { habits: true }
      });
    } else {
      // 2. Delete habits from database
      if (deletedHabitsSet.size > 0) {
        await prisma.habit.deleteMany({
          where: { userId: user.id, id: { in: Array.from(deletedHabitsSet) } }
        });
      }

      // 3. Update User Settings
      await prisma.user.update({
        where: { id: user.id },
        data: {
          theme: state.theme,
          bgStyle: state.bgStyle,
          lang: state.lang,
          themeColor: state.themeColor,
          avatar: state.avatar || user.avatar || 'user',
          emergencyCards: state.emergencyCards || [],
          grantedCards: newGranted,
          finishedTickets: state.finishedTickets || [],
          updatedAt: new Date(),
          ...(state.activeSessionType !== undefined && { activeSessionType: state.activeSessionType }),
          ...(state.activeSessionData !== undefined && { activeSessionData: state.activeSessionData }),
          ...(state.spotifyRefreshToken ? { spotifyRefreshToken: state.spotifyRefreshToken } : {}),
          ...(state.privacySettings !== undefined && { privacySettings: state.privacySettings }),
          ...(state.timezone ? { timezone: state.timezone } : {}),
        }
      });
    }

    // 4. Sync Habits (Upsert only active non-deleted habits)
    if (activeStateHabits.length > 0) {
      const existingHabitsMap = new Map((user.habits || []).map(h => [h.id, h]));
      const habitsToUpsert = [];

      for (const h of activeStateHabits) {
        if (!h.id || !h.name) continue;
        const ex = existingHabitsMap.get(h.id);
        const subItemsMatch = ex && JSON.stringify(ex.subItems || []) === JSON.stringify(h.subItems || []);
        const scheduleDaysMatch = ex && JSON.stringify(ex.scheduleDays || []) === JSON.stringify(h.scheduleDays || []);
        const hasChanged = !ex || 
          ex.name !== h.name || 
          ex.type !== (h.type || 'single') || 
          !subItemsMatch || 
          ex.frequency !== (h.frequency || 'daily') ||
          !scheduleDaysMatch ||
          ex.scheduleDate !== (h.scheduleDate || null) ||
          ex.time !== (h.time || null) ||
          ex.duration !== (h.duration || null) ||
          ex.location !== (h.location || null) ||
          ex.category !== (h.category || 'habit') ||
          ex.isPrivate !== (h.isPrivate || false) ||
          ex.isNotifyEnabled !== (h.isNotifyEnabled || false) || 
          ex.notifyTime !== (h.notifyTime || null) || 
          ex.notifyBefore !== (h.notifyBefore ?? 0) ||
          ex.customMessage !== (h.customMessage || null);

        if (hasChanged) {
          habitsToUpsert.push(h);
        }
      }

      if (habitsToUpsert.length > 0) {
        // IDOR protection: batch query habit ownership in ONE roundtrip instead of N sequential queries
        const habitIds = habitsToUpsert.map(h => h.id);
        const existingInDb = await prisma.habit.findMany({
          where: { id: { in: habitIds } },
          select: { id: true, userId: true }
        });
        const foreignHabitIds = new Set(
          existingInDb.filter(h => h.userId !== user.id).map(h => h.id)
        );
        const validHabits = habitsToUpsert.filter(h => !foreignHabitIds.has(h.id));

        // Execute upserts in parallel
        await Promise.all(validHabits.map(h => prisma.habit.upsert({
          where: { id: h.id },
          create: {
            id: h.id,
            name: h.name,
            type: h.type || 'single',
            subItems: h.subItems || [],
            frequency: h.frequency || 'daily',
            scheduleDays: h.scheduleDays || [],
            scheduleDate: h.scheduleDate || null,
            time: h.time || null,
            duration: h.duration || null,
            location: h.location || null,
            category: h.category || 'habit',
            isPrivate: Boolean(h.isPrivate),
            isNotifyEnabled: h.isNotifyEnabled || false,
            notifyTime: h.notifyTime || null,
            notifyBefore: h.notifyBefore ?? 0,
            customMessage: h.customMessage || null,
            userId: user.id
          },
          update: {
            name: h.name,
            type: h.type || 'single',
            subItems: h.subItems || [],
            frequency: h.frequency || 'daily',
            scheduleDays: h.scheduleDays || [],
            scheduleDate: h.scheduleDate || null,
            time: h.time || null,
            duration: h.duration || null,
            location: h.location || null,
            category: h.category || 'habit',
            isPrivate: Boolean(h.isPrivate),
            isNotifyEnabled: h.isNotifyEnabled || false,
            notifyTime: h.notifyTime || null,
            notifyBefore: h.notifyBefore ?? 0,
            customMessage: h.customMessage || null,
          }
        })));
      }
    }

    // 5. Sync Daily Logs — ONLY FOR TODAY AND YESTERDAY (no querying all days)
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
        userId: user.id,
        date: { in: targetDatesArray }
      }
    });
    const existingLogsMap = new Map(existingDailyLogs.map(l => [l.date, l]));

    await Promise.all(targetDatesArray.map(async (date) => {
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
      const mergedTasks = Array.isArray(clientTasks)
        ? clientTasks
        : existingTasks;

      const clientSleep = state.sleepData?.[date];
      const sleepVal = clientSleep !== undefined ? clientSleep : (existingDailyLog?.sleep || null);

      const clientFocus = state.focusTimeData?.[date] || 0;
      const existingFocus = existingDailyLog?.focusTime || 0;
      const focusVal = Math.max(clientFocus, existingFocus);

      return prisma.dailyLog.upsert({
        where: { userId_date: { userId: user.id, date } },
        create: {
          userId: user.id,
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
    }));

    const finalUser = await prisma.user.update({
      where: { id: user.id },
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
