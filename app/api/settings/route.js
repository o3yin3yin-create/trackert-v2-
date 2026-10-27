import { NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth-server";
import prisma from "@/lib/prisma";

export async function POST(req) {
  try {
    const userId = await getAuthUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { fcmToken } = body;

    if (!fcmToken || typeof fcmToken !== "string" || fcmToken.length > 500) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    await prisma.user.update({
      where: { clerkId: userId },
      data: { fcmToken },
    });

    return NextResponse.json({ success: true, message: "Notification token saved successfully" });
  } catch (error) {
    console.error("Settings API Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
