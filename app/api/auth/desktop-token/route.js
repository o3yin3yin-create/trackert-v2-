import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';
import { signDesktopToken } from '@/lib/auth-server';

const prisma = new PrismaClient();

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses?.[0]?.emailAddress || '';
    const name = clerkUser?.firstName ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim() : 'User';
    const avatar = clerkUser?.imageUrl || '';
    let username = clerkUser?.username || null;

    if (!username) {
      const dbUser = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { username: true }
      });
      username = dbUser?.username || null;
    }

    const token = signDesktopToken({
      userId,
      email,
      name,
      username,
      iat: Date.now(),
      exp: Date.now() + 365 * 24 * 60 * 60 * 1000, // Valid for 1 year
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: userId,
        email,
        name,
        avatar,
        username,
      },
    });
  } catch (error) {
    console.error('[Desktop Token Error]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
