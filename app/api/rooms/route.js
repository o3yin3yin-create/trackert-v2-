import { prisma } from '@/lib/prisma';
import { json, requireMe, OPTIONS } from '@/lib/friends';
import { rateLimit, getClientIp } from '@/lib/rateLimit';
import { publishRoomUpdate, formatRoomSummary } from '@/lib/roomBus';

export { OPTIONS };

const ROOM_STALE_MS = 12 * 60 * 60 * 1000; // 12h max room lifetime without activity
let lastStaleSweepAt = 0;

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export async function GET(req) {
  const me = await requireMe(req);
  if (!me) return json({ error: 'unauthorized' }, 401, req);

  try {
    // Throttled stale room sweep (at most once every 5 minutes, zero write overhead on normal GETs)
    const nowMs = Date.now();
    if (nowMs - lastStaleSweepAt > 5 * 60 * 1000) {
      lastStaleSweepAt = nowMs;
      const staleCutoff = new Date(nowMs - ROOM_STALE_MS);
      await prisma.studyRoom.updateMany({
        where: { isActive: true, updatedAt: { lt: staleCutoff } },
        data: { isActive: false, endedAt: new Date() },
      }).catch(() => {});
    }

    // Check if I'm currently active in a room
    const myMembership = await prisma.studyRoomMember.findFirst({
      where: { userId: me.id, isActive: true, room: { isActive: true } },
      include: {
        room: {
          include: {
            host: { select: { id: true, name: true, username: true } },
            members: {
              where: { isActive: true },
              orderBy: { joinedAt: 'asc' },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    username: true,
                    avatar: true,
                    activeSessionType: true,
                    activeSessionData: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Accepted friends (for "friends" visibility rooms)
    const friendships = await prisma.friendship.findMany({
      where: {
        status: 'accepted',
        OR: [{ requesterId: me.id }, { addresseeId: me.id }],
      },
      select: { requesterId: true, addresseeId: true },
    });
    const friendIds = friendships.map((f) => (f.requesterId === me.id ? f.addresseeId : f.requesterId));

    // Friends-only rooms + Public rooms (private rooms are NEVER listed — invite code only)
    const [friendRoomsRaw, publicRoomsRaw] = await Promise.all([
      friendIds.length > 0
        ? prisma.studyRoom.findMany({
            where: { isActive: true, visibility: 'friends', hostId: { in: friendIds } },
            orderBy: { startedAt: 'desc' },
            take: 20,
            include: {
              host: { select: { id: true, name: true, username: true } },
              members: {
                where: { isActive: true },
                include: { user: { select: { id: true, name: true, username: true, avatar: true, activeSessionType: true, activeSessionData: true } } },
              },
            },
          })
        : Promise.resolve([]),
      prisma.studyRoom.findMany({
        where: { isActive: true, visibility: 'public', hostId: { not: me.id } },
        orderBy: { startedAt: 'desc' },
        take: 25,
        include: {
          host: { select: { id: true, name: true, username: true } },
          members: {
            where: { isActive: true },
            include: { user: { select: { id: true, name: true, username: true, avatar: true, activeSessionType: true, activeSessionData: true } } },
          },
        },
      }),
    ]);

    const myRoomId = myMembership?.room?.id;

    return json(
      {
        myRoom: myMembership?.room ? formatRoomSummary(myMembership.room, me.id) : null,
        friendRooms: friendRoomsRaw
          .filter((r) => r.id !== myRoomId && r.members.some((m) => m.isActive))
          .map((r) => formatRoomSummary(r, me.id)),
        publicRooms: publicRoomsRaw
          .filter((r) => r.id !== myRoomId && r.members.some((m) => m.isActive))
          .map((r) => formatRoomSummary(r, me.id)),
      },
      200,
      req
    );
  } catch (err) {
    console.error('[Rooms GET Error]:', err);
    return json({ error: 'internal_error' }, 500, req);
  }
}

export async function POST(req) {
  const ip = getClientIp(req);
  if (!(await rateLimit(`rooms-ip:${ip}`, 40, 60_000))) {
    return json({ error: 'too_many_requests' }, 429, req);
  }

  const me = await requireMe(req);
  if (!me) return json({ error: 'unauthorized' }, 401, req);

  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (action === 'create') {
      if (!(await rateLimit(`rooms-create:${me.id}`, 3, 60_000))) {
        return json({ error: 'Too many rooms created. Please wait a minute.' }, 429, req);
      }
      const name = String(body?.name || '').trim().slice(0, 48) || `${me.name || me.username || 'Study'}'s Room`;
      const visibility = ['public', 'friends', 'private'].includes(body?.visibility) ? body.visibility : 'private';
      const topic = String(body?.topic || '').trim().slice(0, 80) || null;

      // Deactivate any previous rooms hosted by me & leave other rooms
      await prisma.studyRoom.updateMany({
        where: { hostId: me.id, isActive: true },
        data: { isActive: false, endedAt: new Date() },
      });
      await prisma.studyRoomMember.updateMany({
        where: { userId: me.id, isActive: true },
        data: { isActive: false },
      });

      let code = generateRoomCode();
      for (let i = 0; i < 4; i++) {
        const exists = await prisma.studyRoom.findUnique({ where: { code } });
        if (!exists) break;
        code = generateRoomCode();
      }

      const room = await prisma.studyRoom.create({
        data: {
          code,
          name,
          visibility,
          hostId: me.id,
          isActive: true,
          members: {
            create: {
              userId: me.id,
              topic,
              isActive: true,
            },
          },
        },
        include: {
          host: { select: { id: true, name: true, username: true } },
          members: {
            where: { isActive: true },
            include: { user: { select: { id: true, name: true, username: true, avatar: true, activeSessionType: true, activeSessionData: true } } },
          },
        },
      });

      const summary = formatRoomSummary(room, me.id);
      publishRoomUpdate(room.id, summary);
      return json({ room: summary }, 200, req);
    }

    if (action === 'join') {
      if (!(await rateLimit(`rooms-join:${me.id}`, 10, 60_000))) {
        return json({ error: 'Too many join attempts. Please wait a minute.' }, 429, req);
      }
      const roomId = body?.roomId ? String(body.roomId) : null;
      const code = body?.code ? String(body.code).trim().toUpperCase() : null;
      const topic = String(body?.topic || '').trim().slice(0, 80) || null;

      const room = await prisma.studyRoom.findFirst({
        where: {
          isActive: true,
          ...(roomId ? { id: roomId } : code ? { code } : { id: '__none__' }),
        },
      });

      if (!room) {
        return json({ error: 'Room not found or has ended.' }, 404, req);
      }

      // Access checks:
      // - private: ONLY host or exact invite code
      // - friends: host, exact invite code, or accepted friend
      // - public: anyone
      if (room.visibility === 'private' && room.hostId !== me.id && !code) {
        return json({ error: 'This room is private. Enter the invite code to join.' }, 403, req);
      }
      if (room.visibility === 'friends' && room.hostId !== me.id && !code) {
        const isFriend = await prisma.friendship.findFirst({
          where: {
            status: 'accepted',
            OR: [
              { requesterId: me.id, addresseeId: room.hostId },
              { requesterId: room.hostId, addresseeId: me.id },
            ],
          },
        });
        if (!isFriend) {
          return json({ error: 'This room is for friends only. Enter an invite code to join.' }, 403, req);
        }
      }

      // Leave other active memberships
      await prisma.studyRoomMember.updateMany({
        where: { userId: me.id, isActive: true, roomId: { not: room.id } },
        data: { isActive: false },
      });

      await prisma.studyRoomMember.upsert({
        where: { roomId_userId: { roomId: room.id, userId: me.id } },
        create: {
          roomId: room.id,
          userId: me.id,
          topic,
          isActive: true,
          joinedAt: new Date(),
          lastSeen: new Date(),
        },
        update: {
          isActive: true,
          ...(topic !== null ? { topic } : {}),
          lastSeen: new Date(),
        },
      });

      const updatedRoom = await prisma.studyRoom.findUnique({
        where: { id: room.id },
        include: {
          host: { select: { id: true, name: true, username: true } },
          members: {
            where: { isActive: true },
            orderBy: { joinedAt: 'asc' },
            include: { user: { select: { id: true, name: true, username: true, avatar: true, activeSessionType: true, activeSessionData: true } } },
          },
        },
      });

      const summary = formatRoomSummary(updatedRoom, me.id);
      publishRoomUpdate(room.id, summary);
      return json({ room: summary }, 200, req);
    }

    if (action === 'heartbeat') {
      const roomId = String(body?.roomId || '');
      const topic = body?.topic !== undefined ? String(body.topic || '').trim().slice(0, 80) || null : undefined;

      if (!roomId) return json({ error: 'missing_room_id' }, 400, req);

      await prisma.studyRoomMember.updateMany({
        where: { roomId, userId: me.id, isActive: true },
        data: {
          lastSeen: new Date(),
          ...(topic !== undefined ? { topic } : {}),
        },
      });

      const updatedRoom = await prisma.studyRoom.findFirst({
        where: { id: roomId, isActive: true },
        include: {
          host: { select: { id: true, name: true, username: true } },
          members: {
            where: { isActive: true },
            orderBy: { joinedAt: 'asc' },
            include: { user: { select: { id: true, name: true, username: true, avatar: true, activeSessionType: true, activeSessionData: true } } },
          },
        },
      });

      const summary = updatedRoom ? formatRoomSummary(updatedRoom, me.id) : null;
      if (roomId) publishRoomUpdate(roomId, summary);
      return json({ room: summary }, 200, req);
    }

    if (action === 'visibility') {
      const roomId = String(body?.roomId || '');
      const visibility = ['public', 'friends', 'private'].includes(body?.visibility) ? body.visibility : 'private';
      const room = await prisma.studyRoom.findFirst({
        where: { id: roomId, hostId: me.id, isActive: true },
      });
      if (!room) return json({ error: 'forbidden' }, 403, req);

      const updatedRoom = await prisma.studyRoom.update({
        where: { id: room.id },
        data: { visibility },
        include: {
          host: { select: { id: true, name: true, username: true } },
          members: {
            where: { isActive: true },
            orderBy: { joinedAt: 'asc' },
            include: { user: { select: { id: true, name: true, username: true, avatar: true, activeSessionType: true, activeSessionData: true } } },
          },
        },
      });
      publishRoomUpdate(room.id, formatRoomSummary(updatedRoom, me.id));
      return json({ success: true, visibility }, 200, req);
    }

    if (action === 'leave' || action === 'end') {
      const roomId = String(body?.roomId || '');
      if (roomId) {
        await prisma.studyRoomMember.updateMany({
          where: { roomId, userId: me.id, isActive: true },
          data: { isActive: false },
        });
        if (action === 'end') {
          await prisma.studyRoom.updateMany({
            where: { id: roomId, hostId: me.id, isActive: true },
            data: { isActive: false, endedAt: new Date() },
          });
          await prisma.studyRoomMember.updateMany({
            where: { roomId, isActive: true },
            data: { isActive: false },
          });
          publishRoomUpdate(roomId, null);
        } else {
          const updatedRoom = await prisma.studyRoom.findFirst({
            where: { id: roomId, isActive: true },
            include: {
              host: { select: { id: true, name: true, username: true } },
              members: {
                where: { isActive: true },
                orderBy: { joinedAt: 'asc' },
                include: { user: { select: { id: true, name: true, username: true, avatar: true, activeSessionType: true, activeSessionData: true } } },
              },
            },
          });
          publishRoomUpdate(roomId, updatedRoom ? formatRoomSummary(updatedRoom, me.id) : null);
        }
      }
      return json({ success: true }, 200, req);
    }

    return json({ error: 'invalid_action' }, 400, req);
  } catch (err) {
    console.error('[Rooms POST Error]:', err);
    return json({ error: 'internal_error' }, 500, req);
  }
}
