import { EventEmitter } from 'events';
import crypto from 'crypto';

const globalForDomino = globalThis;

if (!globalForDomino.__bokraDominoBus) {
  const emitter = new EventEmitter();
  emitter.setMaxListeners(500);
  globalForDomino.__bokraDominoBus = {
    emitter,
    rooms: new Map(), // roomId -> roomState
  };
}

const bus = globalForDomino.__bokraDominoBus;
const ROOM_TTL_MS = 2 * 60 * 60 * 1000;

function pruneOldRooms() {
  const now = Date.now();
  for (const [id, r] of bus.rooms.entries()) {
    if (now - (r.updatedAt || r.createdAt || 0) > ROOM_TTL_MS) {
      bus.rooms.delete(id);
    }
  }
}

function createShuffledDeck(excludeDoubleZero = false) {
  const deck = [];
  for (let i = 0; i <= 6; i++) {
    for (let j = i; j <= 6; j++) {
      if (excludeDoubleZero && i === 0 && j === 0) continue;
      deck.push([i, j]);
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function dealRoundState(playerIds) {
  const count = playerIds.length;
  const isThree = count === 3;
  const deck = createShuffledDeck(isThree);
  const perPlayer = isThree ? 9 : 7;

  const hands = {};
  playerIds.forEach((id, idx) => {
    hands[id] = deck.slice(idx * perPlayer, (idx + 1) * perPlayer);
  });
  const pile = deck.slice(count * perPlayer);

  // Determine starter: highest double, then highest pip sum
  let turnUserId = playerIds[0];
  let bestDouble = -1;
  for (const id of playerIds) {
    for (const [a, b] of hands[id]) {
      if (a === b && a > bestDouble) {
        bestDouble = a;
        turnUserId = id;
      }
    }
  }
  if (bestDouble === -1) {
    let bestSum = -1;
    for (const id of playerIds) {
      for (const [a, b] of hands[id]) {
        if (a + b > bestSum) {
          bestSum = a + b;
          turnUserId = id;
        }
      }
    }
  }

  return {
    hands,
    pile,
    board: [],
    startIdx: 0,
    leftVal: null,
    rightVal: null,
    turnUserId,
    consecutivePasses: 0,
    winnerUserId: null,
    endReason: null,
  };
}

export function canPlayTileOnRoom(tile, room) {
  if (!room || room.board.length === 0) return { left: true, right: true };
  return {
    left: tile[0] === room.leftVal || tile[1] === room.leftVal,
    right: tile[0] === room.rightVal || tile[1] === room.rightVal,
  };
}

function hasAnyValidMove(hand, room) {
  return hand.some((t) => {
    const c = canPlayTileOnRoom(t, room);
    return c.left || c.right;
  });
}

function handPipSum(hand) {
  return hand.reduce((acc, [a, b]) => acc + a + b, 0);
}

export function publishDominoUpdate(roomId) {
  const room = bus.rooms.get(roomId);
  if (!room) return;
  room.updatedAt = Date.now();
  bus.emitter.emit(`domino:${roomId}`, room);
}

export function subscribeDominoRoom(roomId, listener) {
  const eventName = `domino:${roomId}`;
  bus.emitter.on(eventName, listener);
  return () => {
    bus.emitter.off(eventName, listener);
  };
}

export function getDominoRoom(roomId) {
  pruneOldRooms();
  return bus.rooms.get(roomId) || null;
}

export function isRoomParticipant(room, userId) {
  return Boolean(room && userId && room.players.some((p) => p.id === userId));
}

export function createDominoRoom(hostUser, guestUsers) {
  pruneOldRooms();
  const roomId = `dom_${crypto.randomBytes(6).toString('hex')}`;
  const allUsers = [hostUser, ...guestUsers.slice(0, 3)];
  const players = allUsers.map((u, idx) => ({
    id: u.id,
    username: u.username || `player${idx + 1}`,
    name: u.name || u.username || `Player ${idx + 1}`,
    avatar: u.avatar || 'user',
    joined: idx === 0,
  }));
  const scores = {};
  players.forEach((p) => {
    scores[p.id] = 0;
  });

  const room = {
    id: roomId,
    status: 'waiting', // 'waiting' | 'playing' | 'ended' | 'cancelled'
    createdAt: Date.now(),
    updatedAt: Date.now(),
    hostId: hostUser.id,
    players,
    activeOrder: players.map((p) => p.id),
    scores,
    hands: {},
    pile: [],
    board: [],
    startIdx: 0,
    leftVal: null,
    rightVal: null,
    turnUserId: hostUser.id,
    consecutivePasses: 0,
    winnerUserId: null,
    endReason: null,
    lastReaction: null,
  };
  bus.rooms.set(roomId, room);
  return room;
}

export function joinDominoRoom(roomId, userId) {
  const room = bus.rooms.get(roomId);
  if (!room || !isRoomParticipant(room, userId)) return null;
  if (room.status === 'cancelled') return room;

  const player = room.players.find((p) => p.id === userId);
  if (player && !player.joined) {
    player.joined = true;
    const allJoined = room.players.every((p) => p.joined);
    if (allJoined && room.status === 'waiting') {
      const activeIds = room.players.map((p) => p.id);
      room.activeOrder = activeIds;
      Object.assign(room, dealRoundState(activeIds), { status: 'playing' });
    }
    publishDominoUpdate(roomId);
  }
  return room;
}

export function startDominoRoom(roomId, userId) {
  const room = bus.rooms.get(roomId);
  if (!room || room.hostId !== userId) return { error: 'forbidden' };
  if (room.status !== 'waiting') return { error: 'already_started' };
  const joinedPlayers = room.players.filter((p) => p.joined);
  if (joinedPlayers.length < 2) return { error: 'need_more_players' };

  const activeIds = joinedPlayers.map((p) => p.id);
  room.activeOrder = activeIds;
  Object.assign(room, dealRoundState(activeIds), { status: 'playing' });
  publishDominoUpdate(roomId);
  return { room };
}

function getNextTurnId(room, currentId) {
  const order = room.activeOrder || [];
  const idx = order.indexOf(currentId);
  if (idx === -1 || order.length === 0) return currentId;
  return order[(idx + 1) % order.length];
}

export function playDominoTile(roomId, userId, tileIndex, side) {
  const room = bus.rooms.get(roomId);
  if (!room || !isRoomParticipant(room, userId)) return { error: 'room_not_found' };
  if (room.status !== 'playing') return { error: 'not_playing' };
  if (room.turnUserId !== userId) return { error: 'not_your_turn' };

  const hand = room.hands[userId] || [];
  if (tileIndex < 0 || tileIndex >= hand.length) return { error: 'invalid_tile' };
  const tile = hand[tileIndex];
  const fit = canPlayTileOnRoom(tile, room);

  let chosenSide = side;
  if (room.board.length === 0) {
    chosenSide = 'left';
  } else if (chosenSide !== 'left' && chosenSide !== 'right') {
    if (fit.left && !fit.right) chosenSide = 'left';
    else if (fit.right && !fit.left) chosenSide = 'right';
    else return { error: 'ambiguous_side' };
  }

  if (room.board.length > 0 && !fit[chosenSide]) {
    return { error: 'tile_does_not_fit' };
  }

  hand.splice(tileIndex, 1);

  if (room.board.length === 0) {
    room.board.push([tile[0], tile[1]]);
    room.startIdx = 0;
    room.leftVal = tile[0];
    room.rightVal = tile[1];
  } else if (chosenSide === 'left') {
    const oriented = tile[1] === room.leftVal ? [tile[0], tile[1]] : [tile[1], tile[0]];
    room.board.unshift(oriented);
    room.startIdx = (room.startIdx || 0) + 1;
    room.leftVal = oriented[0];
  } else {
    const oriented = tile[0] === room.rightVal ? [tile[0], tile[1]] : [tile[1], tile[0]];
    room.board.push(oriented);
    room.rightVal = oriented[1];
  }

  room.consecutivePasses = 0;

  if (hand.length === 0) {
    room.status = 'ended';
    room.winnerUserId = userId;
    room.endReason = 'domino';
    room.scores[userId] = (room.scores[userId] || 0) + 1;
  } else {
    room.turnUserId = getNextTurnId(room, userId);
  }

  publishDominoUpdate(roomId);
  return { room };
}

export function drawDominoTile(roomId, userId) {
  const room = bus.rooms.get(roomId);
  if (!room || !isRoomParticipant(room, userId)) return { error: 'room_not_found' };
  if (room.status !== 'playing') return { error: 'not_playing' };
  if (room.turnUserId !== userId) return { error: 'not_your_turn' };
  if (room.pile.length === 0) return { error: 'pile_empty' };

  const hand = room.hands[userId] || [];
  if (hasAnyValidMove(hand, room)) {
    return { error: 'has_valid_move' };
  }

  const drawn = room.pile.pop();
  hand.push(drawn);
  publishDominoUpdate(roomId);
  return { room };
}

export function passDominoTurn(roomId, userId) {
  const room = bus.rooms.get(roomId);
  if (!room || !isRoomParticipant(room, userId)) return { error: 'room_not_found' };
  if (room.status !== 'playing') return { error: 'not_playing' };
  if (room.turnUserId !== userId) return { error: 'not_your_turn' };

  const hand = room.hands[userId] || [];
  if (room.pile.length > 0 || hasAnyValidMove(hand, room)) {
    return { error: 'cannot_pass' };
  }

  room.consecutivePasses += 1;
  const playerCount = (room.activeOrder || []).length || 2;

  if (room.consecutivePasses >= playerCount) {
    let minPips = Infinity;
    let winners = [];
    for (const pid of room.activeOrder) {
      const s = handPipSum(room.hands[pid] || []);
      if (s < minPips) {
        minPips = s;
        winners = [pid];
      } else if (s === minPips) {
        winners.push(pid);
      }
    }
    room.status = 'ended';
    room.endReason = 'blocked';
    if (winners.length === 1) {
      room.winnerUserId = winners[0];
      room.scores[winners[0]] = (room.scores[winners[0]] || 0) + 1;
    } else {
      room.winnerUserId = null;
    }
  } else {
    room.turnUserId = getNextTurnId(room, userId);
  }

  publishDominoUpdate(roomId);
  return { room };
}

export function requestDominoRematch(roomId, userId) {
  const room = bus.rooms.get(roomId);
  if (!room || !isRoomParticipant(room, userId)) return { error: 'room_not_found' };
  if (room.status === 'cancelled') return { error: 'cancelled' };

  const activeIds = room.activeOrder?.length ? room.activeOrder : room.players.filter((p) => p.joined).map((p) => p.id);
  const round = dealRoundState(activeIds);
  Object.assign(room, round, { status: 'playing' });
  publishDominoUpdate(roomId);
  return { room };
}

export function leaveDominoRoom(roomId, userId) {
  const room = bus.rooms.get(roomId);
  if (!room || !isRoomParticipant(room, userId)) return null;
  room.status = 'cancelled';
  room.cancelledBy = userId;
  publishDominoUpdate(roomId);
  return room;
}

const ALLOWED_REACTIONS = ['👏', '🔥', '😂', '😮', '💀'];

export function sendDominoReaction(roomId, userId, emoji) {
  const room = bus.rooms.get(roomId);
  if (!room || !isRoomParticipant(room, userId)) return { error: 'room_not_found' };
  const safeEmoji = ALLOWED_REACTIONS.includes(emoji) ? emoji : '👏';
  const sender = room.players.find((p) => p.id === userId);
  room.lastReaction = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    userId,
    name: sender?.name || 'Player',
    emoji: safeEmoji,
    at: Date.now(),
  };
  publishDominoUpdate(roomId);
  return { room };
}

export function sanitizeDominoRoom(room, userId) {
  if (!room || !isRoomParticipant(room, userId)) return null;
  const isHost = room.hostId === userId;
  const me = room.players.find((p) => p.id === userId) || room.players[0];
  const activeIds = room.activeOrder || room.players.map((p) => p.id);
  const activePlayers = room.players.filter((p) => activeIds.includes(p.id));
  const others = activePlayers.filter((p) => p.id !== userId);
  const myHand = room.hands[userId] || [];
  const canMove = hasAnyValidMove(myHand, room);
  const turnPlayer = room.players.find((p) => p.id === room.turnUserId);
  const winnerPlayer = room.players.find((p) => p.id === room.winnerUserId);
  const opp = others[0] || room.players[1] || me;
  const oppHand = room.hands[opp.id] || [];

  return {
    roomId: room.id,
    status: room.status,
    isHost,
    playerCount: room.status === 'waiting' ? room.players.filter((p) => p.joined).length : activeIds.length,
    invitedCount: room.players.length,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      username: p.username,
      joined: p.joined,
      score: room.scores[p.id] || 0,
      tileCount: (room.hands[p.id] || []).length,
    })),
    board: room.board,
    startIdx: room.startIdx || 0,
    leftVal: room.leftVal,
    rightVal: room.rightVal,
    pileCount: room.pile.length,
    turnUserId: room.turnUserId,
    turnName: turnPlayer?.name || 'Player',
    isMyTurn: room.status === 'playing' && room.turnUserId === userId,
    winnerUserId: room.winnerUserId,
    winnerName: winnerPlayer?.name || '',
    endReason: room.endReason,
    cancelledBy: room.cancelledBy || null,
    myId: me.id,
    myName: me.name,
    myScore: room.scores[me.id] || 0,
    myHand,
    opponentId: opp.id,
    opponentName: opp.name,
    opponentUsername: opp.username,
    opponentScore: room.scores[opp.id] || 0,
    opponentCount: oppHand.length,
    canPass: room.status === 'playing' && room.turnUserId === userId && room.pile.length === 0 && !canMove,
    canDraw: room.status === 'playing' && room.turnUserId === userId && room.pile.length > 0 && !canMove,
    lastReaction: room.lastReaction || null,
  };
}
