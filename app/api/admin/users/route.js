import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';

const prisma = new PrismaClient();

export async function GET(req) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const caller = await prisma.user.findUnique({ where: { id: userId } });
    if (!caller || !caller.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        isAdmin: true,
        isBlocked: true,
        createdAt: true,
        _count: {
          select: { habits: true, dailyLogs: true }
        }
      }
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Admin Users GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const caller = await prisma.user.findUnique({ where: { id: userId } });
    if (!caller || !caller.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { targetUserId, action } = await req.json();

    if (!targetUserId || !action) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Protect primary admin from any negative actions or demotion
    if (targetUser.email === '3yin3yin@gmail.com') {
      if (['block', 'removeAdmin'].includes(action)) {
        return NextResponse.json({ error: 'Cannot modify primary admin' }, { status: 403 });
      }
    }

    let updatedUser;
    if (action === 'block') {
      updatedUser = await prisma.user.update({
        where: { id: targetUserId },
        data: { isBlocked: true }
      });
    } else if (action === 'unblock') {
      updatedUser = await prisma.user.update({
        where: { id: targetUserId },
        data: { isBlocked: false }
      });
    } else if (action === 'makeAdmin') {
      updatedUser = await prisma.user.update({
        where: { id: targetUserId },
        data: { isAdmin: true }
      });
    } else if (action === 'removeAdmin') {
      // Prevent a user from removing their own admin status (as an extra safeguard)
      if (targetUserId === caller.id) {
        return NextResponse.json({ error: 'Cannot remove your own admin status' }, { status: 403 });
      }
      updatedUser = await prisma.user.update({
        where: { id: targetUserId },
        data: { isAdmin: false }
      });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Admin Users POST Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
