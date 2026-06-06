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

    const groups = await prisma.studyGroup.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, friendCode: true }
            }
          }
        }
      }
    });

    return NextResponse.json({ groups });
  } catch (error) {
    console.error('Admin Groups GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
