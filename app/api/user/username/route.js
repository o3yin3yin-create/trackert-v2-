import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';
import { getAuthUserId } from '@/lib/auth-server';

const prisma = new PrismaClient();

function getCorsHeaders(req) {
  const origin = req?.headers?.get('origin');
  const headers = {
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
  };
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  return headers;
}

export async function OPTIONS(req) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...getCorsHeaders(req),
      'Access-Control-Max-Age': '86400',
    }
  });
}

export async function POST(req) {
  const cors = getCorsHeaders(req);
  const userId = await getAuthUserId(req);

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: cors });
  }

  try {
    const body = await req.json();
    const clean = (body?.username || '').trim().toLowerCase();

    if (!clean || clean.length < 4 || clean.length > 30) {
      return NextResponse.json(
        { error: 'Username must be between 4 and 30 characters.' },
        { status: 400, headers: cors }
      );
    }

    if (/^\d+$/.test(clean)) {
      return NextResponse.json(
        { error: 'Username cannot be numbers only.' },
        { status: 400, headers: cors }
      );
    }

    if (!/^[a-z0-9_.]+$/.test(clean)) {
      return NextResponse.json(
        { error: 'Username can only contain letters, numbers, underscores, and dots.' },
        { status: 400, headers: cors }
      );
    }

    // 1. Check if taken in database
    const existingInDb = await prisma.user.findFirst({
      where: {
        username: clean,
        NOT: { id: userId }
      }
    });

    if (existingInDb) {
      return NextResponse.json(
        { error: 'That username is already taken. Try another.' },
        { status: 400, headers: cors }
      );
    }

    // 2. Update via Clerk Backend API (uses CLERK_SECRET_KEY, bypasses client re-verification requirement)
    try {
      const client = await clerkClient();
      await client.users.updateUser(userId, { username: clean });
    } catch (clerkErr) {
      console.warn('[Username API] Clerk updateUser error:', clerkErr);
      const msg = clerkErr?.errors?.[0]?.longMessage ||
                  clerkErr?.errors?.[0]?.message ||
                  clerkErr?.message ||
                  'Failed to update username in Clerk.';
      return NextResponse.json({ error: msg }, { status: 400, headers: cors });
    }

    // 3. Update database record
    await prisma.user.upsert({
      where: { id: userId },
      update: { username: clean },
      create: {
        id: userId,
        email: `${userId}@bokra.app`,
        username: clean,
        name: clean
      }
    });

    return NextResponse.json({ success: true, username: clean }, { status: 200, headers: cors });
  } catch (error) {
    console.error('[Username API] Internal error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500, headers: cors }
    );
  }
}
