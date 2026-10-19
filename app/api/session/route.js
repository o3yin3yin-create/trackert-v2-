import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth-server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req) {
  const userId = await getAuthUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { type, data } = await req.json();

    await prisma.user.update({
      where: { id: userId },
      data: {
        activeSessionType: type || null,
        activeSessionData: data || null,
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Session API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
