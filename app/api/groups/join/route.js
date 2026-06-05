import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';

const prisma = new PrismaClient();

export async function POST(req) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { code } = body;

    if (!code || code.trim() === '') {
      return NextResponse.json({ error: 'Group code is required' }, { status: 400 });
    }

    const group = await prisma.studyGroup.findUnique({
      where: { code: code.trim().toUpperCase() }
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const existing = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId
        }
      }
    });

    if (existing) {
      return NextResponse.json({ error: 'You are already in this group' }, { status: 400 });
    }

    await prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Group Join Error:', error);
    return NextResponse.json({ error: 'Failed to join group' }, { status: 500 });
  }
}
