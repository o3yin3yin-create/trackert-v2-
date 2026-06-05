import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';

const prisma = new PrismaClient();

// Accept a friend request
export async function POST(req) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { requestId } = await req.json();

    if (!requestId) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }

    const friendship = await prisma.friendship.findUnique({
      where: { id: requestId }
    });

    if (!friendship) {
      return NextResponse.json({ error: 'Friend request not found' }, { status: 404 });
    }

    // Only the receiver can accept
    if (friendship.friendId !== userId) {
      return NextResponse.json({ error: 'Not authorized to accept this request' }, { status: 403 });
    }

    await prisma.friendship.update({
      where: { id: requestId },
      data: { status: 'ACCEPTED' }
    });

    return NextResponse.json({ success: true, message: 'Friend request accepted' });

  } catch (error) {
    console.error('Friends Accept Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
