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
        friendCode: true,
        isAdmin: true,
        isBlocked: true,
        createdAt: true,
        _count: {
          select: { friendships: true, friendRequests: true, groupMembers: true, habits: true, dailyLogs: true }
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

    const { targetUserId, action } = await req.json(); // action can be 'block' or 'unblock'

    if (!targetUserId || !action) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { isBlocked: action === 'block' }
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Admin Users POST Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
