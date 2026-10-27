import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth-server';
import prisma from '@/lib/prisma';
import { rateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

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
  const userId = await getAuthUserId(req);
  if (!userId) return NextResponse.json({ activeSessionType: null, activeSessionData: null });

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
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ activeSessionType: null, activeSessionData: null });
  }
}

export async function POST(req) {
  const userId = await getAuthUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!await rateLimit(`session:${userId}`, 60, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { type, data } = body;

    // Validate type enum
    const validTypes = ['pomodoro', 'flight', null, ''];
    if (type !== undefined && !validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid session type' }, { status: 400 });
    }

    // Validate data payload size
    if (data !== undefined && data !== null) {
      if (typeof data !== 'object') {
        return NextResponse.json({ error: 'Invalid session data format' }, { status: 400 });
      }
      const dataStr = JSON.stringify(data);
      if (dataStr.length > 25_000) {
        return NextResponse.json({ error: 'Session data exceeds allowed limit' }, { status: 413 });
      }
    }

    await prisma.user.update({
      where: { clerkId: userId },
      data: {
        activeSessionType: type || null,
        activeSessionData: data || null,
      }
    });

    sessionCache.set(userId, {
      data: { activeSessionType: type || null, activeSessionData: data || null },
      exp: Date.now() + 2500
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Session API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
