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
const ROOM_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

function pruneOldRooms() {
  const now = Date.now();
  for (const [id, r] of bus.rooms.entries()) {
    if (now - (r.updatedAt || r.createdAt || 0) > ROOM_TTL_MS) {
      bus.rooms.delete(id);
    }
  }
}

function createShuffledDeck() {
  const deck = [];
  for (let i = 0; i <= 6; i++) {
    for (let j = i; j <= 6; j++) {
      deck.push([i, j]);
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function dealRoundState(hostId, guestId) {
  const deck = createShuffledDeck();
  const hostHand = deck.slice(0, 7);
  const guestHand = deck.slice(7, 14);
  const pile = deck.slice(14);

  // Determine starter: highest double, then highest pip sum
  let turnUserId = hostId;
  let bestDouble = -1;
  for (const [a, b] of hostHand) {
    if (a === b && a > bestDouble) {
      bestDouble = a;
      turnUserId = hostId;
    }
  }
  for (const [a, b] of guestHand) {
    if (a === b && a > bestDouble) {
      bestDouble = a;
      turnUserId = guestId;
    }
  }
  if (bestDouble === -1) {
    let bestSum = -1;
    for (const [a, b] of hostHand) {
      if (a + b > bestSum) {
        bestSum = a + b;
        turnUserId = hostId;
      }
    }
    for (const [a, b] of guestHand) {
      if (a + b > bestSum) {
        bestSum = a + b;
        turnUserId = guestId;
      }
    }
  }

  return {
    hands: {
      [hostId]: hostHand,
      [guestId]: guestHand,
    },
    pile,
    board: [],
    leftVal: null,
    rightVal: null,
    turnUserId,
    consecutivePasses: 0,
    winnerUserId: null,
    endReason: null,
    rematchVotes: [],
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
  return Boolean(room && userId && (room.host.id === userId || room.guest.id === userId));
}

export function createDominoRoom(hostUser, guestUser) {
  pruneOldRooms();
  const roomId = `dom_${crypto.randomBytes(6).toString('hex')}`;
  const round = dealRoundState(hostUser.id, guestUser.id);
  const room = {
    id: roomId,
    status: 'waiting', // 'waiting' | 'playing' | 'ended' | 'cancelled'
    createdAt: Date.now(),
    updatedAt: Date.now(),
    host: {
      id: hostUser.id,
      username: hostUser.username || 'player1',
      name: hostUser.name || hostUser.username || 'Player 1',
      avatar: hostUser.avatar || 'user',
    },
    guest: {
      id: guestUser.id,
      username: guestUser.username || 'player2',
      name: guestUser.name || guestUser.username || 'Player 2',
      avatar: guestUser.avatar || 'user',
    },
    scores: {
      [hostUser.id]: 0,
      [guestUser.id]: 0,
    },
    ...round,
  };
  bus.rooms.set(roomId, room);
  return room;
}

export function joinDominoRoom(roomId, userId) {
  const room = bus.rooms.get(roomId);
  if (!room || !isRoomParticipant(room, userId)) return null;
  if (room.status === 'cancelled') return room;
  if (userId === room.guest.id && room.status === 'waiting') {
    room.status = 'playing';
    publishDominoUpdate(roomId);
  }
  return room;
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
    room.leftVal = tile[0];
    room.rightVal = tile[1];
  } else if (chosenSide === 'left') {
    const oriented = tile[1] === room.leftVal ? [tile[0], tile[1]] : [tile[1], tile[0]];
    room.board.unshift(oriented);
    room.leftVal = oriented[0];
  } else {
    const oriented = tile[0] === room.rightVal ? [tile[0], tile[1]] : [tile[1], tile[0]];
    room.board.push(oriented);
    room.rightVal = oriented[1];
  }

  room.consecutivePasses = 0;

  const otherId = userId === room.host.id ? room.guest.id : room.host.id;

  if (hand.length === 0) {
    room.status = 'ended';
    room.winnerUserId = userId;
    room.endReason = 'domino';
    room.scores[userId] = (room.scores[userId] || 0) + 1;
  } else {
    room.turnUserId = otherId;
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
  const otherId = userId === room.host.id ? room.guest.id : room.host.id;

  if (room.consecutivePasses >= 2) {
    const hostPips = handPipSum(room.hands[room.host.id] || []);
    const guestPips = handPipSum(room.hands[room.guest.id] || []);
    room.status = 'ended';
    room.endReason = 'blocked';
    if (hostPips < guestPips) {
      room.winnerUserId = room.host.id;
      room.scores[room.host.id] = (room.scores[room.host.id] || 0) + 1;
    } else if (guestPips < hostPips) {
      room.winnerUserId = room.guest.id;
      room.scores[room.guest.id] = (room.scores[room.guest.id] || 0) + 1;
    } else {
      room.winnerUserId = null; // Draw
    }
  } else {
    room.turnUserId = otherId;
  }

  publishDominoUpdate(roomId);
  return { room };
}

export function requestDominoRematch(roomId, userId) {
  const room = bus.rooms.get(roomId);
  if (!room || !isRoomParticipant(room, userId)) return { error: 'room_not_found' };
  if (room.status === 'cancelled') return { error: 'cancelled' };

  const round = dealRoundState(room.host.id, room.guest.id);
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

export function sanitizeDominoRoom(room, userId) {
  if (!room || !isRoomParticipant(room, userId)) return null;
  const isHost = room.host.id === userId;
  const me = isHost ? room.host : room.guest;
  const opp = isHost ? room.guest : room.host;
  const myHand = room.hands[userId] || [];
  const oppHand = room.hands[opp.id] || [];
  const canMove = hasAnyValidMove(myHand, room);

  return {
    roomId: room.id,
    status: room.status,
    isHost,
    board: room.board,
    leftVal: room.leftVal,
    rightVal: room.rightVal,
    pileCount: room.pile.length,
    turnUserId: room.turnUserId,
    isMyTurn: room.status === 'playing' && room.turnUserId === userId,
    winnerUserId: room.winnerUserId,
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
  };
}
