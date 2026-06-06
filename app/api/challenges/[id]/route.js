import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';
const prisma = new PrismaClient();

export async function POST(req, { params }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const challengeId = params.id;
    const { progress } = await req.json();

    await prisma.challengeParticipant.update({
      where: {
        challengeId_userId: { challengeId, userId }
      },
      data: {
        progress
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Challenge Progress Update Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
