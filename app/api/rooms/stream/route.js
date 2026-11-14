import { requireMe } from '@/lib/friends';
import { getCachedRoom, subscribeRoom } from '@/lib/roomBus';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const me = await requireMe(req);
  if (!me) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get('roomId');
  if (!roomId) {
    return new Response('Missing roomId', { status: 400 });
  }

  // Verify membership once on connect (uses RAM cache first to avoid DB hit if already cached)
  let initialRoom = getCachedRoom(roomId);
  const isCachedMember = initialRoom?.members?.some((m) => m.userId === me.id);
  if (!initialRoom || !isCachedMember) {
    const member = await prisma.studyRoomMember.findFirst({
      where: { roomId, userId: me.id, isActive: true, room: { isActive: true } },
    });
    if (!member) {
      return new Response('Forbidden', { status: 403 });
    }
  }

  const encoder = new TextEncoder();
  let unsubscribe = null;
  let keepAliveTimer = null;

  const stream = new ReadableStream({
    start(controller) {
      const cleanup = () => {
        if (keepAliveTimer) {
          clearInterval(keepAliveTimer);
          keepAliveTimer = null;
        }
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
      };

      const sendEvent = (payload) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          cleanup();
        }
      };

      if (initialRoom) {
        sendEvent({ room: initialRoom });
      }

      unsubscribe = subscribeRoom(roomId, (updatedRoom) => {
        sendEvent({ room: updatedRoom });
      });

      // Tiny RAM-only keep-alive comment every 25s (0 DB queries)
      keepAliveTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'));
        } catch {
          cleanup();
        }
      }, 25000);
    },
    cancel() {
      if (keepAliveTimer) {
        clearInterval(keepAliveTimer);
        keepAliveTimer = null;
      }
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
