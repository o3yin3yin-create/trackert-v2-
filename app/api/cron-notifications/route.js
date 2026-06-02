import prisma from "../../../lib/prisma";
import { NextResponse } from "next/server";
import admin from "firebase-admin";




const hasFirebaseCreds = 
  !!(process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY);

// تهيئة Firebase Admin SDK لحقن الإشعارات في الباك إند (لو مش متهيأ ومعانا المفاتيح)
if (hasFirebaseCreds && !admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // بنستبدل الـ \n عشان الـ Private Key يقرا صح في السيرفر
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  } catch (err) {
    console.error("Failed to initialize Firebase Admin SDK:", err);
  }
}

export async function GET(req) {
  try {
    if (!hasFirebaseCreds || !admin.apps.length) {
      return NextResponse.json({ success: false, error: "Firebase credentials not configured" }, { status: 400 });
    }

    // 1. حساب الوقت الحالي على السيرفر وفورمته لنظام 12 ساعة (مثال: 08:00 PM)
    const now = new Date();
    const current12hTime = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }); // هيرجع حاجة شبه "08:00 PM"

    console.log(`[Cron Job] Checking habits for time: ${current12hTime}`);

    // 2. البحث عن كل العادات المفعّل لها ريمايندر وميعادها "الآن"
    const matchingHabits = await prisma.habit.findMany({
      where: {
        isNotifyEnabled: true,
        notifyTime: current12hTime,
      },
      include: {
        user: true, // بنجيب بيانات اليوزر معاها عشان لقط الـ fcmToken
      },
    });

    if (matchingHabits.length === 0) {
      return NextResponse.json({ success: true, message: "مفيش عادات ميعادها دلوقتي." });
    }

    const sendPromises = matchingHabits.map(async (habit) => {
      const token = habit.user.fcmToken;
      
      if (!token) {
        console.log(`[Cron Job] اليوزر ${habit.user.id} معندوش FCM Token مسجل.`);
        return;
      }

      // 3. صياغة الإشعار بالرسالة المخصصة اللي إنت كتبتها للعادة
      const message = {
        notification: {
          title: `6afra Tracker 🚀`,
          body: habit.customMessage || `حان وقت عادة: ${habit.name}!`,
        },
        token: token,
      };

      // 4. إرسال الإشعار الفعلي عبر جهاز جوجل
      return admin.messaging().send(message);
    });

    await Promise.all(sendPromises);

    return NextResponse.json({ 
      success: true, 
      message: `تم إرسال ${matchingHabits.length} إشعار مخصص بنجاح! 🔥🚀` 
    });

  } catch (error) {
    console.error("Cron Job Error:", error);
    return NextResponse.json({ error: "حصلت مشكلة في سكريبت الكرون" }, { status: 500 });
  }
}
