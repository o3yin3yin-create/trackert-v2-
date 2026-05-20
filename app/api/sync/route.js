import prisma from "../../../lib/prisma";
import { NextResponse } from "next/server";

// --- GET: جلب البيانات السحابية بالكامل للمستخدم ---
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const clerkId = searchParams.get("clerkId");

    if (!clerkId) {
      return NextResponse.json({ success: false, error: "Missing Clerk ID" }, { status: 400 });
    }

    console.log("📥 Fetching cloud data for user:", clerkId);

    // البحث عن المستخدم وتضمين بياناته بالكامل
    const user = await prisma.user.findUnique({
      where: { id: clerkId },
      include: {
        habits: true,
        dailyLogs: true,
        sleepLogs: true,
      },
    });

    // لو اليوزر مش موجود أو جديد خالص بنرجع بيانات فارغة
    if (!user) {
      return NextResponse.json({
        success: true,
        habits: [],
        dailyData: {},
        sleepData: {},
        dailyTasksData: {}
      });
    }

    // فورمات العادات بالشكل المتوقع في الفرونت إند
    const habits = user.habits.map(h => ({
      id: h.id,
      name: h.name,
      type: h.type,
      subItems: h.subItems,
      isNotifyEnabled: h.isNotifyEnabled,
      notifyTime: h.notifyTime,
      customMessage: h.customMessage
    }));

    // دمج السجلات اليومية المفلطحة للفرونت إند
    const dailyData = {};
    user.dailyLogs.forEach(log => {
      if (log.logs && typeof log.logs === 'object') {
        Object.entries(log.logs).forEach(([key, val]) => {
          dailyData[key] = val;
        });
      }
    });

    // تحويل ساعات النوم
    const sleepData = {};
    user.sleepLogs.forEach(log => {
      sleepData[log.date] = log.hours;
    });

    // تجميع المهام اليومية (Daily Tasks)
    const dailyTasksData = {};
    user.dailyLogs.forEach(log => {
      if (log.tasks && Array.isArray(log.tasks)) {
        dailyTasksData[log.date] = log.tasks;
      }
    });

    return NextResponse.json({
      success: true,
      habits,
      dailyData,
      sleepData,
      dailyTasksData
    });
  } catch (error) {
    console.error("Sync GET API Error:", error);
    return NextResponse.json({ success: false, error: "Failed to load cloud data" }, { status: 500 });
  }
}

// --- POST: مزامنة وحفظ البيانات سحابياً ---
export async function POST(req) {
  try {
    const body = await req.json();
    const { clerkId, email, habits, dailyData, sleepData, dailyTasksData } = body;

    if (!clerkId) {
      return NextResponse.json({ success: false, error: "Missing Clerk ID" }, { status: 400 });
    }

    console.log("🔄 Syncing and saving data for user:", clerkId);

    // 1. مزامنة وحفظ بيانات المستخدم الأساسية (تم تعديل الحقل ليكون id)
    await prisma.user.upsert({
      where: { id: clerkId },
      update: { email: email || "" },
      create: { id: clerkId, email: email || "" },
    });

    // 2. مزامنة العادات (Habits)
    if (habits && Array.isArray(habits)) {
      const incomingIds = habits.map(h => h.id);
      
      // مسح العادات التي تم حذفها من واجهة المستخدم محلياً
      await prisma.habit.deleteMany({
        where: {
          userId: clerkId,
          id: { notIn: incomingIds }
        }
      });

      // حفظ العادات الحالية
      for (const habit of habits) {
        await prisma.habit.upsert({
          where: { id: habit.id },
          update: {
            name: habit.name,
            type: habit.type,
            subItems: habit.subItems,
            isNotifyEnabled: habit.isNotifyEnabled || false,
            notifyTime: habit.notifyTime || null,
            customMessage: habit.customMessage || null,
          },
          create: {
            id: habit.id,
            userId: clerkId,
            name: habit.name,
            type: habit.type,
            subItems: habit.subItems,
            isNotifyEnabled: habit.isNotifyEnabled || false,
            notifyTime: habit.notifyTime || null,
            customMessage: habit.customMessage || null,
          }
        });
      }
    }

    // 3. مزامنة السجلات اليومية (Daily Logs)
    if (dailyData && typeof dailyData === 'object') {
      const dailyLogsByDate = {};
      
      // تجميع الـ state المفرود حسب التاريخ YYYY-MM-DD
      Object.entries(dailyData).forEach(([key, val]) => {
        const date = key.substring(0, 10);
        if (!dailyLogsByDate[date]) {
          dailyLogsByDate[date] = {};
        }
        dailyLogsByDate[date][key] = val;
      });

      // كتابة السجلات في الداتابيز
      for (const [date, logs] of Object.entries(dailyLogsByDate)) {
        // Prepare update/create objects
        const updateData = { logs: logs };
        const createData = {
            userId: clerkId,
            date: date,
            logs: logs
        };

        // إذا كان هناك tasks لنفس اليوم، نضيفها
        if (dailyTasksData && dailyTasksData[date]) {
            updateData.tasks = dailyTasksData[date];
            createData.tasks = dailyTasksData[date];
        }

        await prisma.dailyLog.upsert({
          where: {
            userId_date: {
              userId: clerkId,
              date: date
            }
          },
          update: updateData,
          create: createData
        });
      }

      // إذا كان هناك tasks لأيام ليس لها logs بعد (نادر الحدوث لكن وارد)
      if (dailyTasksData && typeof dailyTasksData === 'object') {
        for (const [date, tasks] of Object.entries(dailyTasksData)) {
            if (!dailyLogsByDate[date]) {
                await prisma.dailyLog.upsert({
                    where: { userId_date: { userId: clerkId, date: date } },
                    update: { tasks: tasks },
                    create: { userId: clerkId, date: date, logs: {}, tasks: tasks }
                });
            }
        }
      }
    } else if (dailyTasksData && typeof dailyTasksData === 'object') {
      // إذا لم يكن هناك dailyData على الإطلاق، لكن يوجد tasks
      for (const [date, tasks] of Object.entries(dailyTasksData)) {
        await prisma.dailyLog.upsert({
            where: { userId_date: { userId: clerkId, date: date } },
            update: { tasks: tasks },
            create: { userId: clerkId, date: date, logs: {}, tasks: tasks }
        });
      }
    }

    // 4. مزامنة سجلات النوم (Sleep Logs)
    if (sleepData && typeof sleepData === 'object') {
      for (const [date, hours] of Object.entries(sleepData)) {
        if (hours === null || hours === undefined || isNaN(Number(hours))) continue;
        await prisma.sleepLog.upsert({
          where: {
            userId_date: {
              userId: clerkId,
              date: date
            }
          },
          update: { hours: Number(hours) },
          create: {
            userId: clerkId,
            date: date,
            hours: Number(hours)
          }
        });
      }
    }

    return NextResponse.json({ success: true, message: "تمت المزامنة وحفظ البيانات سحابياً بنجاح! 🔄" });
    
  } catch (error) {
    console.error("Sync POST API Error:", error);
    return NextResponse.json({ success: false, error: "Sync failed safely" }, { status: 500 });
  }
}