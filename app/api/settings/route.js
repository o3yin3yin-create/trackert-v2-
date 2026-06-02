import { NextResponse } from "next/server";




export async function POST(req) {
  try {
    const body = await req.json();
    const { clerkId, email, fcmToken } = body;

    // هنطبع التوكن في التيرمنال عشان نتأكد إن فايربيز جابه بنجاح
    console.log("🔥 TOKEN RECEIVED IN BACKEND:", fcmToken);

    // هنرد على الفرونت إند برسالة نجاح (JSON سليم 100%)
    return NextResponse.json({ success: true, message: "تم ربط الإشعارات بنجاح! 🔥" });
    
  } catch (error) {
    console.error("Settings API Error:", error);
    return NextResponse.json({ success: false, error: "Error" }, { status: 500 });
  }
}
