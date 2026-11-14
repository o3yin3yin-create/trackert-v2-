import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth-server';
import prisma from '@/lib/prisma';
import { rateLimit, getClientIp } from '@/lib/rateLimit';
import { schedulePomodoroEnd, cancelPomodoroPush } from '@/lib/pushSchedule';
import { publishRoomUpdate, formatRoomSummary } from '@/lib/roomBus';
import { getCorsHeaders, handleCorsOptions } from '@/lib/cors';

export const dynamic = 'force-dynamic';

export async function OPTIONS(req) {
  return handleCorsOptions(req);
}

// Short-lived in-memory session cache to relieve DB connection pool (TTL: 2500ms)
const sessionCache = new Map();

function cleanStaleSessionCache() {
  if (sessionCache.size > 2000) {
    const now = Date.now();
    for (const [key, val] of sessionCache.entries()) {
      if (now > val.exp) sessionCache.delete(key);
    }
  }
}

export async function GET(req) {
  const cors = getCorsHeaders(req);
  const ip = getClientIp(req);
  if (!await rateLimit(`session-get-ip:${ip}`, 120, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: cors });
  }

  const userId = await getAuthUserId(req);
  if (!userId) return NextResponse.json({ activeSessionType: null, activeSessionData: null }, { headers: cors });

  const now = Date.now();
  const bypass = req?.headers?.get?.('x-bypass-cache') === '1' || process.env.DISABLE_SESSION_CACHE === 'true';
  if (!bypass) {
    const cached = sessionCache.get(userId);
    if (cached && now < cached.exp) {
      return NextResponse.json(cached.data);
    }
  }

  try {
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { activeSessionType: true, activeSessionData: true }
    });
    const result = {
      activeSessionType: user?.activeSessionType || null,
      activeSessionData: user?.activeSessionData || null
    };
    sessionCache.set(userId, { data: result, exp: now + 2500 });
    cleanStaleSessionCache();
    return NextResponse.json(result, { headers: cors });
  } catch (e) {
    return NextResponse.json({ activeSessionType: null, activeSessionData: null }, { headers: cors });
  }
}

export async function POST(req) {
  const cors = getCorsHeaders(req);
  const ip = getClientIp(req);
  if (!await rateLimit(`session-post-ip:${ip}`, 60, 60_000)) {
    return NextResponse.json({ error: 'Too many requests from this IP' }, { status: 429, headers: cors });
  }

  const userId = await getAuthUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: cors });

  if (!await rateLimit(`session:${userId}`, 60, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: cors });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { type, data } = body;

    // Validate type enum
    const validTypes = ['pomodoro', 'flight', 'flow', null, ''];
    if (type !== undefined && !validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid session type' }, { status: 400, headers: cors });
    }

    // Validate data payload size
    if (data !== undefined && data !== null) {
      if (typeof data !== 'object') {
        return NextResponse.json({ error: 'Invalid session data format' }, { status: 400, headers: cors });
      }
      const dataStr = JSON.stringify(data);
      if (dataStr.length > 25_000) {
        return NextResponse.json({ error: 'Session data exceeds allowed limit' }, { status: 413, headers: cors });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { clerkId: userId },
      data: {
        activeSessionType: type || null,
        activeSessionData: data || null,
      },
      select: { id: true }
    });

    if (type === 'pomodoro' && data && typeof data === 'object') {
      const remainingSec = Number(data.remainingSec || data.initialTime || 0);
      if (remainingSec > 10) {
        const endTimeSec = Math.floor(Date.now() / 1000) + remainingSec;
        schedulePomodoroEnd(updatedUser.id, endTimeSec).catch(() => {});
      }
    } else {
      cancelPomodoroPush(updatedUser.id).catch(() => {});
    }

    sessionCache.set(userId, {
      data: { activeSessionType: type || null, activeSessionData: data || null },
      exp: Date.now() + 2500
    });

    // If user is currently in an active Study Room, broadcast their updated mode/phase to roommates in RAM
    prisma.studyRoomMember.findFirst({
      where: { userId: updatedUser.id, isActive: true, room: { isActive: true } },
      select: { roomId: true },
    }).then(async (membership) => {
      if (!membership) return;
      const activeRoom = await prisma.studyRoom.findFirst({
        where: { id: membership.roomId, isActive: true },
        include: {
          host: { select: { id: true, name: true, username: true } },
          members: {
            where: { isActive: true },
            orderBy: { joinedAt: 'asc' },
            include: { user: { select: { id: true, name: true, username: true, avatar: true, activeSessionType: true, activeSessionData: true } } },
          },
        },
      });
      if (activeRoom) {
        publishRoomUpdate(activeRoom.id, formatRoomSummary(activeRoom, updatedUser.id));
      }
    }).catch(() => {});

    return NextResponse.json({ success: true }, { headers: cors });
  } catch (error) {
    console.error('Session API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: cors });
  }
}
