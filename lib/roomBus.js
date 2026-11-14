import { EventEmitter } from 'events';

const globalForBus = globalThis;

if (!globalForBus.__bokraRoomBus) {
  const emitter = new EventEmitter();
  emitter.setMaxListeners(500);
  globalForBus.__bokraRoomBus = {
    emitter,
    cache: new Map(), // roomId -> { room, updatedAt }
  };
}

const bus = globalForBus.__bokraRoomBus;

export function publishRoomUpdate(roomId, roomSummary) {
  if (!roomId) return;
  if (roomSummary) {
    bus.cache.set(roomId, { room: roomSummary, updatedAt: Date.now() });
  } else {
    bus.cache.delete(roomId);
  }
  bus.emitter.emit(`room:${roomId}`, roomSummary);
}

export function getCachedRoom(roomId) {
  const entry = bus.cache.get(roomId);
  if (!entry) return null;
  // Cache valid for 15 minutes in RAM
  if (Date.now() - entry.updatedAt > 15 * 60 * 1000) {
    bus.cache.delete(roomId);
    return null;
  }
  return entry.room;
}

export function subscribeRoom(roomId, listener) {
  const eventName = `room:${roomId}`;
  bus.emitter.on(eventName, listener);
  return () => {
    bus.emitter.off(eventName, listener);
  };
}

export function getFlowPhaseLabel(elapsedSec) {
  if (elapsedSec >= 90 * 60) return 'PHASE 4 · DEEP WORK';
  if (elapsedSec >= 45 * 60) return 'PHASE 3 · HYPERFLOW';
  if (elapsedSec >= 15 * 60) return 'PHASE 2 · FOCUS';
  return 'PHASE 1 · ONSET';
}

export function formatRoomSummary(room, meId) {
  const activeMembers = (room.members || []).filter((m) => m.isActive);
  return {
    id: room.id,
    code: room.code,
    name: room.name,
    visibility: room.visibility,
    isHost: room.hostId === meId,
    hostName: room.host?.name || room.host?.username || 'Host',
    hostUsername: room.host?.username || '',
    startedAt: room.startedAt,
    memberCount: activeMembers.length,
    members: activeMembers.map((m) => {
      const u = m.user || {};
      const joinedSec = Math.max(0, Math.floor((Date.now() - new Date(m.joinedAt).getTime()) / 1000));
      let modeLabel = 'In Room';
      if (u.activeSessionType === 'flow' && u.activeSessionData?.startTime) {
        const flowSec = Math.max(0, Math.floor(Date.now() / 1000) - Number(u.activeSessionData.startTime));
        modeLabel = `Deep Flow · ${getFlowPhaseLabel(flowSec)}`;
      } else if (u.activeSessionType === 'pomodoro') {
        modeLabel = 'Pomodoro';
      } else if (u.activeSessionType === 'flight') {
        modeLabel = 'Flight Focus';
      }
      return {
        id: m.id,
        userId: m.userId,
        username: u.username || 'user',
        name: u.name || u.username || 'Student',
        avatar: u.avatar || 'user',
        topic: m.topic || '',
        joinedAt: m.joinedAt,
        elapsedSeconds: joinedSec,
        modeLabel,
      };
    }),
  };
}
