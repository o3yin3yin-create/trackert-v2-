import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Fetch the complete state for the user
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    let user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        habits: true,
        dailyLogs: true,
      },
    });

    if (!user) {
      // First time user, create default record
      user = await prisma.user.create({
        data: { id: userId, email: userId }, // clerk usually provides email, but ID is what matters for foreign keys
        include: { habits: true, dailyLogs: true }
      });
    }

    // Reconstruct the flat state object expected by the frontend
    const state = {
      theme: user.theme,
      bgStyle: user.bgStyle,
      lang: user.lang,
      themeColor: user.themeColor,
      emergencyCards: user.emergencyCards || [],
      grantedCardsLog: user.grantedCards || {},
      habits: user.habits,
      dailyData: {},
      sleepData: {},
      focusTimeData: {},
      pomodoroTasksData: {},
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

    return NextResponse.json({ state });

  } catch (error) {
    console.error('Sync GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Save the complete state to the database
export async function POST(req) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const state = await req.json();

    // 1. Upsert User Settings
    await prisma.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        email: userId, // Placeholder if email isn't available from token
        theme: state.theme || 'dark',
        bgStyle: state.bgStyle || 'aurora',
        lang: state.lang || 'en',
        themeColor: state.themeColor || '#007AFF',
        emergencyCards: state.emergencyCards || [],
        grantedCards: state.grantedCardsLog || {},
      },
      update: {
        theme: state.theme,
        bgStyle: state.bgStyle,
        lang: state.lang,
        themeColor: state.themeColor,
        emergencyCards: state.emergencyCards || [],
        grantedCards: state.grantedCardsLog || {},
      }
    });

    // 2. Sync Habits
    if (state.habits && Array.isArray(state.habits)) {
      const habitIds = state.habits.map(h => h.id);
      
      // Delete habits that were removed
      await prisma.habit.deleteMany({
        where: { userId, id: { notIn: habitIds } }
      });

      // Upsert existing/new habits
      for (const h of state.habits) {
        await prisma.habit.upsert({
          where: { id: h.id },
          create: {
            id: h.id,
            name: h.name,
            type: h.type,
            subItems: h.subItems || [],
            isNotifyEnabled: h.isNotifyEnabled || false,
            notifyTime: h.notifyTime,
            customMessage: h.customMessage,
            userId
          },
          update: {
            name: h.name,
            type: h.type,
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

      // Filter dailyData for this specific date
      const dateDailyData = {};
      for (const [k, v] of Object.entries(state.dailyData || {})) {
        if (k.startsWith(date)) {
          dateDailyData[k] = v;
        }
      }

      await prisma.dailyLog.upsert({
        where: { userId_date: { userId, date } },
        create: {
          userId,
          date,
          logs: dateDailyData,
          sleep: state.sleepData?.[date] || null,
          focusTime: state.focusTimeData?.[date] || 0,
          tasks: state.pomodoroTasksData?.[date] || [],
        },
        update: {
          logs: dateDailyData,
          sleep: state.sleepData?.[date] || null,
          focusTime: state.focusTimeData?.[date] || 0,
          tasks: state.pomodoroTasksData?.[date] || [],
        }
      });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Sync POST Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}