import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';

const prisma = new PrismaClient();

// Get Friends & Pending Requests
export async function GET(req) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // 1. Fetch pending incoming requests
    const incomingRequests = await prisma.friendship.findMany({
      where: { friendId: userId, status: 'PENDING' },
      include: {
        user: { select: { id: true, name: true, friendCode: true } }
      }
    });

    // 2. Fetch accepted friends
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId: userId, status: 'ACCEPTED' },
          { friendId: userId, status: 'ACCEPTED' }
        ]
      },
      include: {
        user: { select: { id: true, name: true, friendCode: true } },
        friend: { select: { id: true, name: true, friendCode: true } }
      }
    });

    // 3. Extract friend profiles and fetch today's stats
    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local time format roughly
    // Wait, the client sends dates in YYYY-MM-DD. Let's rely on that.
    // Actually, to get the date accurately according to the user's timezone, we can pass it as a query param.
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().substring(0, 10);

    const friendsList = [];
    
    for (const f of friendships) {
      const isInitiator = f.userId === userId;
      const friendProfile = isInitiator ? f.friend : f.user;

      // Fetch friend's daily log for today
      const dailyLog = await prisma.dailyLog.findUnique({
        where: { userId_date: { userId: friendProfile.id, date } }
      });

      friendsList.push({
        id: friendProfile.id,
        name: friendProfile.name,
        friendCode: friendProfile.friendCode,
        focusTime: dailyLog?.focusTime || 0,
        habitsCompleted: calculateHabitsCompleted(dailyLog?.logs),
      });
    }

    return NextResponse.json({
      friends: friendsList,
      requests: incomingRequests.map(r => ({
        id: r.id,
        user: r.user
      }))
    });

  } catch (error) {
    console.error('Friends GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Send Friend Request
export async function POST(req) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { friendCode } = await req.json();

    if (!friendCode) {
      return NextResponse.json({ error: 'Friend code is required' }, { status: 400 });
    }

    // Find the user with this friend code
    const friend = await prisma.user.findUnique({
      where: { friendCode: friendCode.toUpperCase() }
    });

    if (!friend) {
      return NextResponse.json({ error: 'User not found with this code' }, { status: 404 });
    }

    if (friend.id === userId) {
      const existingSelf = await prisma.friendship.findFirst({
        where: { userId: userId, friendId: userId }
      });
      if (!existingSelf) {
        await prisma.friendship.create({
          data: { userId: userId, friendId: userId, status: 'ACCEPTED' }
        });
      }
      return NextResponse.json({ success: true, message: 'LONELY_ADD_SELF' });
    }

    // Check if friendship already exists in either direction
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: userId, friendId: friend.id },
          { userId: friend.id, friendId: userId }
        ]
      }
    });

    if (existing) {
      return NextResponse.json({ error: 'Friendship or request already exists' }, { status: 400 });
    }

    // Create pending friendship
    await prisma.friendship.create({
      data: {
        userId,
        friendId: friend.id,
        status: 'PENDING'
      }
    });

    return NextResponse.json({ success: true, message: 'Friend request sent' });

  } catch (error) {
    console.error('Friends POST Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

function calculateHabitsCompleted(logsJson) {
  if (!logsJson) return 0;
  try {
    // logsJson is an object with habitIds as keys
    // We just count how many are marked as completed (assuming true means completed)
    let completed = 0;
    for (const key in logsJson) {
      if (logsJson[key]) completed++;
    }
    return completed;
  } catch (e) {
    return 0;
  }
}
