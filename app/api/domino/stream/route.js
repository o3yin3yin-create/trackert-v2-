import { requireMe } from '@/lib/friends';
import {
  getDominoRoom,
  isRoomParticipant,
  sanitizeDominoRoom,
  subscribeDominoRoom,
} from '@/lib/dominoBus';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const queryToken = searchParams.get('token');
  let authReq = req;
  if (queryToken && !req.headers.get('authorization')) {
    const headers = new Headers(req.headers);
    headers.set('authorization', `Bearer ${queryToken}`);
    authReq = new Request(req.url, { headers });
  }

  const me = await requireMe(authReq);
  if (!me) {
    return new Response('Unauthorized', { status: 401 });
  }

  const roomId = searchParams.get('roomId');
  if (!roomId) {
    return new Response('Missing roomId', { status: 400 });
  }

  const initialRoom = getDominoRoom(roomId);
  if (!initialRoom || !isRoomParticipant(initialRoom, me.id)) {
    return new Response('Forbidden', { status: 403 });
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

      const sendEvent = (room) => {
        try {
          const state = sanitizeDominoRoom(room, me.id);
          if (!state) return;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ state })}\n\n`));
        } catch {
          cleanup();
        }
      };

      try {
        controller.enqueue(encoder.encode(': connected\n\n'));
      } catch {
        cleanup();
        return;
      }

      sendEvent(initialRoom);

      unsubscribe = subscribeDominoRoom(roomId, (updatedRoom) => {
        sendEvent(updatedRoom);
      });

      keepAliveTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'));
        } catch {
          cleanup();
        }
      }, 20000);
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
