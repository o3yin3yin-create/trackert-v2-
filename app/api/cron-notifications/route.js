import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import admin from "firebase-admin";

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
    // 0. Authorization check: Require CRON_SECRET if defined in production
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = req.headers.get("authorization");
      const urlKey = new URL(req.url).searchParams.get("key");
      if (authHeader !== `Bearer ${cronSecret}` && urlKey !== cronSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    if (!hasFirebaseCreds || !admin.apps.length) {
      return NextResponse.json({ success: false, error: "Firebase credentials not configured" }, { status: 400 });
    }

    const now = new Date();
    const current12hTime = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    console.log(`[Cron Job] Checking habits for time: ${current12hTime}`);

    const matchingHabits = await prisma.habit.findMany({
      where: {
        isNotifyEnabled: true,
        notifyTime: current12hTime,
      },
      include: {
        user: true,
      },
    });

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
          title: `6afra Tracker 🚀`,
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
