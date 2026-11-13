import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUserId } from '@/lib/auth-server';
import { getCorsHeaders, handleCorsOptions } from '@/lib/cors';

export async function OPTIONS(req) {
  return handleCorsOptions(req);
}

export async function GET(req) {
  const cors = getCorsHeaders(req);
  const userId = await getAuthUserId(req);

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: cors });
  }

  try {
    let dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { username: true, name: true, avatar: true, email: true }
    });

    let username = dbUser?.username || null;

    if (!username) {
      try {
        const { clerkClient } = await import('@clerk/nextjs/server');
        const client = await clerkClient();
        const clerkUser = await client.users.getUser(userId);
        if (clerkUser?.username) {
          username = clerkUser.username;
          await prisma.user.upsert({
            where: { clerkId: userId },
            update: { username },
            create: {
              clerkId: userId,
              email: clerkUser.emailAddresses?.[0]?.emailAddress || `${userId}@bokra.app`,
              username,
              name: clerkUser.firstName ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim() : username,
            }
          });
        }
      } catch (e) {}
    }

    return NextResponse.json({
      success: true,
      username,
      name: dbUser?.name || null,
      avatar: dbUser?.avatar || null,
      email: dbUser?.email || null,
    }, { status: 200, headers: cors });
  } catch (error) {
    console.error('[Username API GET] Error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500, headers: cors });
  }
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

    // 1. Check if taken in database by another user
    const existingInDb = await prisma.user.findFirst({
      where: {
        username: clean,
        NOT: { clerkId: userId }
      }
    });

    if (existingInDb) {
      return NextResponse.json(
        { error: 'That username is already taken. Try another.' },
        { status: 400, headers: cors }
      );
    }

    // 2. Check if current user already has this exact username in DB
    const currentUserInDb = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { username: true }
    });

    if (currentUserInDb?.username === clean) {
      return NextResponse.json({ success: true, username: clean }, { status: 200, headers: cors });
    }

    // 3. Update via Clerk Backend API if this is a legacy Clerk user
    if (userId.startsWith('user_')) {
      try {
        const { clerkClient } = await import('@clerk/nextjs/server');
        const client = await clerkClient();
        await client.users.updateUser(userId, { username: clean }).catch(() => {});
      } catch (clerkErr) {
        console.warn('[Username API] Clerk updateUser error ignored:', clerkErr);
      }
    }

    // 4. Update database record
    await prisma.user.upsert({
      where: { clerkId: userId },
      update: { username: clean },
      create: {
        clerkId: userId,
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
