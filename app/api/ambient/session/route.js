import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth-server';
import prisma from '@/lib/prisma';
import { rateLimit, getClientIp } from '@/lib/rateLimit';
import { getCorsHeaders, handleCorsOptions } from '@/lib/cors';

export const dynamic = 'force-dynamic';

export async function OPTIONS(req) {
  return handleCorsOptions(req);
}

// In-memory cache for fast cross-device polling (TTL: 1500ms)
const sessionCache = new Map();

export async function GET(req) {
  const cors = getCorsHeaders(req);
  const ip = getClientIp(req);

  if (!await rateLimit(`ambient-get-ip:${ip}`, 180, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: cors });
  }

  const userId = await getAuthUserId(req);
  if (!userId) {
    return NextResponse.json({ session: null }, { headers: cors });
  }

  const now = Date.now();
  const cached = sessionCache.get(userId);
  if (cached && now < cached.exp) {
    return NextResponse.json({ session: cached.data }, { headers: cors });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { activeSessionData: true }
    });

    const activeData = (user?.activeSessionData && typeof user.activeSessionData === 'object')
      ? user.activeSessionData
      : {};

    const ambientSession = activeData.ambientSession || null;

    // Check if session is expired (> 4 minutes without heartbeat)
    if (ambientSession && ambientSession.updatedAt && (now - ambientSession.updatedAt > 240_000)) {
      ambientSession.isPlaying = false;
    }

    sessionCache.set(userId, { data: ambientSession, exp: now + 1500 });

    return NextResponse.json({ session: ambientSession }, { headers: cors });
  } catch (err) {
    console.error('Ambient session GET error:', err);
    return NextResponse.json({ session: null }, { headers: cors });
  }
}

export async function POST(req) {
  const cors = getCorsHeaders(req);
  const ip = getClientIp(req);

  if (!await rateLimit(`ambient-post-ip:${ip}`, 120, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: cors });
  }

  const userId = await getAuthUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: cors });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { deviceId, deviceName, platform, isPlaying, activeTracks, masterVolume, isMuted, targetDeviceId } = body;

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { activeSessionData: true }
    });

    const currentData = (user?.activeSessionData && typeof user.activeSessionData === 'object')
      ? user.activeSessionData
      : {};

    const now = Date.now();
    const updatedAmbientSession = {
      deviceId: deviceId || 'unknown_device',
      deviceName: deviceName || 'Bokra Player',
      platform: platform || 'web',
      isPlaying: Boolean(isPlaying),
      activeTracks: Array.isArray(activeTracks) ? activeTracks.slice(0, 8) : [],
      masterVolume: typeof masterVolume === 'number' ? Math.max(0, Math.min(1, masterVolume)) : 0.8,
      isMuted: Boolean(isMuted),
      targetDeviceId: targetDeviceId || null,
      updatedAt: now,
    };

    const newActiveSessionData = {
      ...currentData,
      ambientSession: updatedAmbientSession
    };

    await prisma.user.update({
      where: { clerkId: userId },
      data: {
        activeSessionData: newActiveSessionData,
      }
    });

    sessionCache.set(userId, { data: updatedAmbientSession, exp: now + 1500 });

    return NextResponse.json({ success: true, session: updatedAmbientSession }, { headers: cors });
  } catch (err) {
    console.error('Ambient session POST error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: cors });
  }
}
