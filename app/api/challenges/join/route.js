import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';
const prisma = new PrismaClient();

export async function POST(req) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { challengeId } = await req.json();
    if (!challengeId) {
      return NextResponse.json({ error: 'Challenge ID is required' }, { status: 400 });
    }

    // Check if challenge exists
    const challenge = await prisma.sharedChallenge.findUnique({
      where: { id: challengeId }
    });

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    // Join challenge
    await prisma.challengeParticipant.upsert({
      where: {
        challengeId_userId: { challengeId, userId }
      },
      create: {
        challengeId,
        userId
      },
      update: {}
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Join Challenge Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
