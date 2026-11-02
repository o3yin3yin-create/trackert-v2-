import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth-server';
import prisma from '@/lib/prisma';
import { getCorsHeaders, handleCorsOptions } from '@/lib/cors';

export const runtime = 'nodejs';

export async function OPTIONS(req) {
  return handleCorsOptions(req);
}

/**
 * POST /api/admin/fix-streak
 * Body: { targetUsername, date, logsOverride }
 * logsOverride: a JSON object matching the dailyData structure e.g. {"2026-10-31-habitId": true}
 * 
 * This endpoint merges logsOverride into the existing DailyLog for a given user+date,
 * allowing an admin to retroactively mark habits as completed.
 */
export async function POST(req) {
  const userId = await getAuthUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getCorsHeaders(req) });

  try {
    const caller = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true, isAdmin: true } });
    if (!caller?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: getCorsHeaders(req) });
    }

    const { targetUsername, date, logsOverride } = await req.json();

    if (!targetUsername || !date || !logsOverride) {
      return NextResponse.json({ error: 'Missing parameters: targetUsername, date, logsOverride required' }, { status: 400, headers: getCorsHeaders(req) });
    }

    // Validate date format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Invalid date format, use YYYY-MM-DD' }, { status: 400, headers: getCorsHeaders(req) });
    }

    const targetUser = await prisma.user.findFirst({ where: { username: targetUsername }, select: { id: true, username: true } });
    if (!targetUser) {
      return NextResponse.json({ error: `User '${targetUsername}' not found` }, { status: 404, headers: getCorsHeaders(req) });
    }

    // Find existing log for that day
    const existingLog = await prisma.dailyLog.findFirst({
      where: { userId: targetUser.id, date },
    });

    let updatedLog;
    if (existingLog) {
      // Merge override into existing logs
      const currentLogs = existingLog.logs && typeof existingLog.logs === 'object' ? existingLog.logs : {};
      const mergedLogs = { ...currentLogs, ...logsOverride };
      updatedLog = await prisma.dailyLog.update({
        where: { id: existingLog.id },
        data: { logs: mergedLogs },
      });
    } else {
      // Create a new log entry for that date with the override
      updatedLog = await prisma.dailyLog.create({
        data: {
          userId: targetUser.id,
          date,
          logs: logsOverride,
        },
      });
    }

    return NextResponse.json({ success: true, date, username: targetUsername, log: updatedLog }, { headers: getCorsHeaders(req) });
  } catch (error) {
    console.error('fix-streak error:', error);
    return NextResponse.json({ error: 'Internal server error', detail: error.message }, { status: 500, headers: getCorsHeaders(req) });
  }
}

/**
 * GET /api/admin/fix-streak?username=omar&date=2026-10-31
 * Returns the existing DailyLog for that user+date so admin knows what keys to set.
 */
export async function GET(req) {
  const userId = await getAuthUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getCorsHeaders(req) });

  try {
    const caller = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true, isAdmin: true } });
    if (!caller?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: getCorsHeaders(req) });
    }

    const url = new URL(req.url);
    const username = url.searchParams.get('username');
    const date = url.searchParams.get('date');

    if (!username || !date) {
      return NextResponse.json({ error: 'Missing username or date query params' }, { status: 400, headers: getCorsHeaders(req) });
    }

    const targetUser = await prisma.user.findFirst({ where: { username }, select: { id: true, username: true } });
    if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404, headers: getCorsHeaders(req) });

    // Also fetch habits so we know what keys to patch
    const [log, habits] = await Promise.all([
      prisma.dailyLog.findFirst({ where: { userId: targetUser.id, date } }),
      prisma.habit.findMany({ where: { userId: targetUser.id }, select: { id: true, name: true, type: true, subItems: true } }),
    ]);

    return NextResponse.json({ log, habits, date, username }, { headers: getCorsHeaders(req) });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error', detail: error.message }, { status: 500, headers: getCorsHeaders(req) });
  }
}
