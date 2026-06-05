import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';

const prisma = new PrismaClient();

// Remove a friend or decline a friend request
export async function POST(req) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { friendId, requestId } = await req.json();

    // Either delete by friendship ID (requestId) or by friend user ID
    if (requestId) {
      const friendship = await prisma.friendship.findUnique({ where: { id: requestId } });
      if (!friendship || (friendship.userId !== userId && friendship.friendId !== userId)) {
        return NextResponse.json({ error: 'Not found or not authorized' }, { status: 404 });
      }
      await prisma.friendship.delete({ where: { id: requestId } });
    } else if (friendId) {
      // Find the mutual friendship
      const friendship = await prisma.friendship.findFirst({
        where: {
          OR: [
            { userId: userId, friendId: friendId },
            { userId: friendId, friendId: userId }
          ]
        }
      });

      if (!friendship) {
        return NextResponse.json({ error: 'Friendship not found' }, { status: 404 });
      }

      await prisma.friendship.delete({ where: { id: friendship.id } });
    } else {
      return NextResponse.json({ error: 'Must provide friendId or requestId' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Removed successfully' });

  } catch (error) {
    console.error('Friends Remove Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
