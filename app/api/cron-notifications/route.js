import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { rateLimit } from "@/lib/rateLimit";

const hasFirebaseCreds = 
  !!(process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY);

if (hasFirebaseCreds && !admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  } catch (err) {
    console.error("Failed to initialize Firebase Admin SDK:", err);
  }
}

export async function GET(req) {
  try {
    // 0. Authorization check: Require CRON_SECRET if defined
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = req.headers.get("authorization");
      const urlKey = new URL(req.url).searchParams.get("key");
      if (authHeader !== `Bearer ${cronSecret}` && urlKey !== cronSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else {
      // In-memory rate limiting if running without CRON_SECRET to prevent DoS flooding
      if (!await rateLimit("cron-notifications", 3, 60_000)) {
        return NextResponse.json({ error: "Too many cron requests" }, { status: 429 });
      }
    }

    if (!hasFirebaseCreds || !admin.apps.length) {
      return NextResponse.json({ success: false, error: "Firebase credentials not configured" }, { status: 400 });
    }

    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday...
    const dayOfMonth = String(now.getDate());
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const monthDay = `${month}-${day}`;

    // Get all habits that have notifications enabled
    const habitsWithNotifications = await prisma.habit.findMany({
      where: {
        isNotifyEnabled: true,
        notifyTime: { not: null },
      },
      include: {
        user: true,
      },
    });

    const matchingHabits = [];

    for (const habit of habitsWithNotifications) {
      if (!habit.notifyTime) continue;

      // 1. Check if habit is scheduled for today
      const freq = habit.frequency || "daily";
      let isScheduledToday = false;
      if (freq === "daily") {
        isScheduledToday = true;
      } else if (freq === "weekly") {
        isScheduledToday = Array.isArray(habit.scheduleDays) && habit.scheduleDays.includes(dayOfWeek);
      } else if (freq === "monthly") {
        isScheduledToday = habit.scheduleDate === dayOfMonth;
      } else if (freq === "yearly") {
        isScheduledToday = habit.scheduleDate === monthDay;
      }

      if (!isScheduledToday) continue;

      // 2. Parse notifyTime and calculate target notification timestamp
      // notifyTime is formatted as "08:00 PM"
      const timeMatch = habit.notifyTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (!timeMatch) continue;

      let hour = parseInt(timeMatch[1], 10);
      const minute = parseInt(timeMatch[2], 10);
      const period = timeMatch[3].toUpperCase();

      if (period === "PM" && hour < 12) hour += 12;
      if (period === "AM" && hour === 12) hour = 0;

      // Create target Date for the event today
      const eventDate = new Date(now);
      eventDate.setHours(hour, minute, 0, 0);

      // Subtract notifyBefore minutes (default 0)
      const notifyBeforeMins = habit.notifyBefore || 0;
      const targetNotifyTime = new Date(eventDate.getTime() - notifyBeforeMins * 60 * 1000);

      // Check if targetNotifyTime matches current time (within 1 minute window)
      const diffMs = Math.abs(now.getTime() - targetNotifyTime.getTime());
      if (diffMs <= 60 * 1000) {
        matchingHabits.push(habit);
      }
    }

    if (matchingHabits.length === 0) {
      return NextResponse.json({ success: true, message: "No habits scheduled at this time." });
    }

    const sendPromises = matchingHabits.map(async (habit) => {
      const token = habit.user.fcmToken;
      
      if (!token) {
        return;
      }

      const message = {
        notification: {
          title: `bokra`,
          body: habit.customMessage || `Habit reminder: ${habit.name}!`,
        },
        token: token,
      };

      return admin.messaging().send(message);
    });

    await Promise.all(sendPromises);

    return NextResponse.json({ 
      success: true, 
      message: `Sent ${matchingHabits.length} notification(s) successfully.` 
    });

  } catch (error) {
    console.error("Cron Job Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
