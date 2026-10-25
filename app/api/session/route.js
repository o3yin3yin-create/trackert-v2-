import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth-server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const userId = await getAuthUserId(req);
  if (!userId) return NextResponse.json({ activeSessionType: null, activeSessionData: null });

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { activeSessionType: true, activeSessionData: true }
    });
    return NextResponse.json({
      activeSessionType: user?.activeSessionType || null,
      activeSessionData: user?.activeSessionData || null
    });
  } catch (e) {
    return NextResponse.json({ activeSessionType: null, activeSessionData: null });
  }
}

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
