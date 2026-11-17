import { prisma } from '@/lib/prisma';
import { json, requireMe, normUsername, OPTIONS } from '@/lib/friends';
import { rateLimit, getClientIp } from '@/lib/rateLimit';
import { sendPush } from '@/lib/push';
import {
  createDominoRoom,
  drawDominoTile,
  getDominoRoom,
  isRoomParticipant,
  joinDominoRoom,
  leaveDominoRoom,
  passDominoTurn,
  playDominoTile,
  requestDominoRematch,
  sanitizeDominoRoom,
  sendDominoReaction,
} from '@/lib/dominoBus';

export { OPTIONS };
export const dynamic = 'force-dynamic';

export async function GET(req) {
  const me = await requireMe(req);
  if (!me) return json({ error: 'unauthorized' }, 401, req);

  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get('roomId');
  if (!roomId) return json({ error: 'missing_room_id' }, 400, req);

  const room = getDominoRoom(roomId);
  if (!room || !isRoomParticipant(room, me.id)) {
    return json({ error: 'room_not_found' }, 404, req);
  }

  return json({ state: sanitizeDominoRoom(room, me.id) }, 200, req);
}

export async function POST(req) {
  const ip = getClientIp(req);
  if (!(await rateLimit(`domino-ip:${ip}`, 120, 60_000))) {
    return json({ error: 'too_many_requests' }, 429, req);
  }

  const me = await requireMe(req);
  if (!me) return json({ error: 'unauthorized' }, 401, req);

  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (action === 'create') {
      if (!(await rateLimit(`domino-create:${me.id}`, 10, 60_000))) {
        return json({ error: 'too_many_requests' }, 429, req);
      }

      const targetUsername = normUsername(body?.targetUsername);
      if (!targetUsername) {
        return json({ error: 'missing_username' }, 400, req);
      }

      const targetUser = await prisma.user.findUnique({
        where: { username: targetUsername },
        select: { id: true, username: true, name: true, avatar: true, notifications: true },
      });

      if (!targetUser) {
        return json({ error: 'user_not_found' }, 404, req);
      }

      if (targetUser.id === me.id) {
        return json({ error: 'cannot_invite_self' }, 400, req);
      }

      const friendship = await prisma.friendship.findFirst({
        where: {
          status: 'accepted',
          OR: [
            { requesterId: me.id, addresseeId: targetUser.id },
            { requesterId: targetUser.id, addresseeId: me.id },
          ],
        },
      });

      if (!friendship) {
        return json({ error: 'not_friends' }, 403, req);
      }

      const room = createDominoRoom(me, targetUser);

      const notifItem = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: 'domino_invite',
        roomId: room.id,
        fromUsername: me.username || 'friend',
        fromName: me.name || me.username || 'Friend',
        fromAvatar: me.avatar || 'user',
        createdAt: Date.now(),
        read: false,
      };

      const existingNotifs = Array.isArray(targetUser.notifications) ? targetUser.notifications : [];
      const filteredExisting = existingNotifs.filter(
        (n) => !(n.type === 'domino_invite' && (n.fromUsername || '').toLowerCase() === (me.username || '').toLowerCase())
      );
      const updatedNotifs = [notifItem, ...filteredExisting].slice(0, 30);

      await prisma.user.update({
        where: { id: targetUser.id },
        data: { notifications: updatedNotifs },
      });

      const senderDisplay = me.name || me.username || 'A friend';
      await sendPush(targetUser.id, {
        title: 'bokra',
        body: `${senderDisplay} invited you to a secret Dominoes match`,
        url: `/?domino=${encodeURIComponent(room.id)}`,
        tag: `domino:${me.id}`,
      }).catch(() => {});

      return json({ roomId: room.id, state: sanitizeDominoRoom(room, me.id) }, 200, req);
    }

    const roomId = body?.roomId;
    if (!roomId) return json({ error: 'missing_room_id' }, 400, req);

    if (action === 'join') {
      const room = joinDominoRoom(roomId, me.id);
      if (!room) return json({ error: 'room_not_found' }, 404, req);
      return json({ state: sanitizeDominoRoom(room, me.id) }, 200, req);
    }

    if (action === 'play') {
      const result = playDominoTile(roomId, me.id, Number(body?.tileIndex), body?.side);
      if (result.error) return json({ error: result.error }, 400, req);
      return json({ state: sanitizeDominoRoom(result.room, me.id) }, 200, req);
    }

    if (action === 'draw') {
      const result = drawDominoTile(roomId, me.id);
      if (result.error) return json({ error: result.error }, 400, req);
      return json({ state: sanitizeDominoRoom(result.room, me.id) }, 200, req);
    }

    if (action === 'pass') {
      const result = passDominoTurn(roomId, me.id);
      if (result.error) return json({ error: result.error }, 400, req);
      return json({ state: sanitizeDominoRoom(result.room, me.id) }, 200, req);
    }

    if (action === 'rematch') {
      const result = requestDominoRematch(roomId, me.id);
      if (result.error) return json({ error: result.error }, 400, req);
      return json({ state: sanitizeDominoRoom(result.room, me.id) }, 200, req);
    }

    if (action === 'react') {
      const result = sendDominoReaction(roomId, me.id, body?.emoji);
      if (result.error) return json({ error: result.error }, 400, req);
      return json({ state: sanitizeDominoRoom(result.room, me.id) }, 200, req);
    }

    if (action === 'leave') {
      leaveDominoRoom(roomId, me.id);
      return json({ success: true }, 200, req);
    }

    return json({ error: 'unknown_action' }, 400, req);
  } catch (err) {
    console.error('[Domino API Error]:', err);
    return json({ error: 'internal_error' }, 500, req);
  }
}
