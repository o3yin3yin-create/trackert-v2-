import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';

const prisma = new PrismaClient();

function generateGroupCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'GRP-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(req) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { name } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
    }

    // Generate unique code
    let code = generateGroupCode();
    let isUnique = false;
    while (!isUnique) {
      const existing = await prisma.studyGroup.findUnique({ where: { code } });
      if (!existing) {
        isUnique = true;
      } else {
        code = generateGroupCode();
      }
    }

    const group = await prisma.studyGroup.create({
      data: {
        name: name.trim(),
        code,
        members: {
          create: {
            userId
          }
        }
      }
    });

    return NextResponse.json({ success: true, group });

  } catch (error) {
    console.error('Group Create Error:', error);
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
  }
}
