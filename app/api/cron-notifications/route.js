import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { runCronNotifications } from "@/lib/cronNotifications";

export async function GET(req) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = req.headers.get("authorization");
      const urlKey = new URL(req.url).searchParams.get("key");
      if (authHeader !== `Bearer ${cronSecret}` && urlKey !== cronSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else {
      if (!await rateLimit("cron-notifications", 3, 60_000)) {
        return NextResponse.json({ error: "Too many cron requests" }, { status: 429 });
      }
    }

    const { sentCount } = await runCronNotifications();
    return NextResponse.json({
      success: true,
      sentCount,
      message: sentCount > 0 ? `Sent ${sentCount} notification(s) successfully.` : "No notifications due right now.",
    });
  } catch (error) {
    console.error("Cron Job Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
