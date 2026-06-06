import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';
const prisma = new PrismaClient();

// GET all challenges for the current user
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const userChallenges = await prisma.challengeParticipant.findMany({
      where: { userId },
      include: {
        challenge: {
          include: {
            participants: {
              include: {
                user: { select: { id: true, name: true, avatar: true } }
              }
            }
          }
        }
      }
    });

    const challenges = userChallenges.map(uc => {
      const challenge = uc.challenge;
      challenge.participants = challenge.participants.map(p => ({
        ...p,
        isMe: p.userId === userId
      }));
      return challenge;
    });

    return NextResponse.json({ challenges });
  } catch (error) {
    console.error('Challenges GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST create a new challenge
export async function POST(req) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { name, tasks } = await req.json();
    if (!name || !tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return NextResponse.json({ error: 'Invalid challenge data' }, { status: 400 });
    }

    const challenge = await prisma.sharedChallenge.create({
      data: {
        name,
        tasks,
        participants: {
          create: {
            userId
          }
        }
      },
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, avatar: true } }
          }
        }
      }
    });

    return NextResponse.json({ success: true, challenge });
  } catch (error) {
    console.error('Challenges POST Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
