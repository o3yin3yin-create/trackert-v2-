// Serverless Local-Network P2P Dominoes over WebRTC DataChannel (2-4 players, 0 internet required)

export function encodeSignal(desc) {
  const payload = JSON.stringify({ t: desc.type, s: desc.sdp });
  return btoa(unescape(encodeURIComponent(payload)));
}

export function decodeSignal(raw) {
  const clean = String(raw || '').trim();
  const parsed = JSON.parse(decodeURIComponent(escape(atob(clean))));
  if (!parsed?.t || !parsed?.s) throw new Error('Invalid code');
  return { type: parsed.t, sdp: parsed.s };
}

function waitForIceComplete(pc, timeoutMs = 1200) {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === 'complete') {
      resolve();
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      pc.removeEventListener('icegatheringstatechange', onState);
      pc.removeEventListener('icecandidate', onCand);
      clearTimeout(timer);
      resolve();
    };
    const onState = () => {
      if (pc.iceGatheringState === 'complete') finish();
    };
    const onCand = (ev) => {
      if (!ev.candidate) finish();
    };
    const timer = setTimeout(finish, timeoutMs);
    pc.addEventListener('icegatheringstatechange', onState);
    pc.addEventListener('icecandidate', onCand);
  });
}

export async function createLocalHostPeer({ onOpen, onMessage, onClose }) {
  const pc = new RTCPeerConnection({ iceServers: [] });
  const dc = pc.createDataChannel('domino', { ordered: true });

  dc.onopen = () => onOpen?.();
  dc.onclose = () => onClose?.();
  dc.onmessage = (ev) => {
    try {
      onMessage?.(JSON.parse(ev.data));
    } catch (_) {}
  };

  pc.onconnectionstatechange = () => {
    if (
      pc.connectionState === 'failed' ||
      pc.connectionState === 'closed' ||
      pc.connectionState === 'disconnected'
    ) {
      onClose?.();
    }
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await waitForIceComplete(pc);

  const offerCode = encodeSignal(pc.localDescription);

  return {
    offerCode,
    async acceptAnswer(answerCode) {
      const desc = decodeSignal(answerCode);
      await pc.setRemoteDescription(new RTCSessionDescription(desc));
    },
    send(obj) {
      if (dc.readyState === 'open') {
        dc.send(JSON.stringify(obj));
      }
    },
    close() {
      try { dc.close(); } catch (_) {}
      try { pc.close(); } catch (_) {}
    },
  };
}

export async function createLocalJoinPeer(offerCode, { onOpen, onMessage, onClose }) {
  const pc = new RTCPeerConnection({ iceServers: [] });
  let dc = null;

  pc.ondatachannel = (ev) => {
    dc = ev.channel;
    dc.onopen = () => onOpen?.();
    dc.onclose = () => onClose?.();
    dc.onmessage = (msg) => {
      try {
        onMessage?.(JSON.parse(msg.data));
      } catch (_) {}
    };
  };

  pc.onconnectionstatechange = () => {
    if (
      pc.connectionState === 'failed' ||
      pc.connectionState === 'closed' ||
      pc.connectionState === 'disconnected'
    ) {
      onClose?.();
    }
  };

  const remoteDesc = decodeSignal(offerCode);
  await pc.setRemoteDescription(new RTCSessionDescription(remoteDesc));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  await waitForIceComplete(pc);

  const answerCode = encodeSignal(pc.localDescription);

  return {
    answerCode,
    send(obj) {
      if (dc && dc.readyState === 'open') {
        dc.send(JSON.stringify(obj));
      }
    },
    close() {
      try { if (dc) dc.close(); } catch (_) {}
      try { pc.close(); } catch (_) {}
    },
  };
}

// --- Authoritative Host Game Engine for 2-4 Local P2P Players ---

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

function canPlayOn(tile, room) {
  if (!room.board.length) return { left: true, right: true };
  return {
    left: tile[0] === room.leftVal || tile[1] === room.leftVal,
    right: tile[0] === room.rightVal || tile[1] === room.rightVal,
  };
}

function hasMove(hand, room) {
  return hand.some((t) => {
    const c = canPlayOn(t, room);
    return c.left || c.right;
  });
}

function pipSum(hand) {
  return hand.reduce((s, [a, b]) => s + a + b, 0);
}

export function createLocalRoomState(playerIds = ['host', 'guest1'], prevScores = null) {
  const isThree = playerIds.length === 3;
  const deck = createShuffledDeck(isThree);
  const perPlayer = isThree ? 9 : 7;

  const hands = {};
  const scores = {};
  playerIds.forEach((id, idx) => {
    hands[id] = deck.slice(idx * perPlayer, (idx + 1) * perPlayer);
    scores[id] = prevScores?.[id] || 0;
  });
  const pile = deck.slice(playerIds.length * perPlayer);

  let turn = playerIds[0];
  let bestD = -1;
  for (const id of playerIds) {
    for (const [a, b] of hands[id]) {
      if (a === b && a > bestD) { bestD = a; turn = id; }
    }
  }
  if (bestD === -1) {
    let bestS = -1;
    for (const id of playerIds) {
      for (const [a, b] of hands[id]) {
        if (a + b > bestS) { bestS = a + b; turn = id; }
      }
    }
  }

  return {
    status: 'playing',
    playerIds: [...playerIds],
    hands,
    pile,
    board: [],
    startIdx: 0,
    leftVal: null,
    rightVal: null,
    turn,
    consecutivePasses: 0,
    winner: null,
    endReason: null,
    scores,
    lastReaction: null,
  };
}

function nextTurn(room, actor) {
  const idx = room.playerIds.indexOf(actor);
  if (idx === -1) return room.playerIds[0];
  return room.playerIds[(idx + 1) % room.playerIds.length];
}

function labelForLocalId(id) {
  if (id === 'host') return 'Host';
  const num = id.replace('guest', '');
  return `Player ${Number(num) + 1 || 2}`;
}

export function applyLocalAction(room, actor, payload) {
  if (!room) return room;
  const handsCopy = {};
  for (const id of room.playerIds) {
    handsCopy[id] = [...(room.hands[id] || [])];
  }
  const next = {
    ...room,
    hands: handsCopy,
    pile: [...room.pile],
    board: [...room.board],
    scores: { ...room.scores },
  };

  if (payload.action === 'react') {
    next.lastReaction = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      userId: actor,
      name: labelForLocalId(actor),
      emoji: payload.emoji || '👏',
      at: Date.now(),
    };
    return next;
  }

  if (payload.action === 'rematch') {
    return createLocalRoomState(room.playerIds, next.scores);
  }

  if (next.status !== 'playing' || next.turn !== actor) return room;

  const hand = next.hands[actor];

  if (payload.action === 'play') {
    const idx = Number(payload.tileIndex);
    if (idx < 0 || idx >= hand.length) return room;
    const tile = hand[idx];
    const fit = canPlayOn(tile, next);
    let side = payload.side;
    if (next.board.length === 0) side = 'left';
    else if (side !== 'left' && side !== 'right') {
      if (fit.left && !fit.right) side = 'left';
      else if (fit.right && !fit.left) side = 'right';
      else return room;
    }
    if (next.board.length > 0 && !fit[side]) return room;

    hand.splice(idx, 1);
    if (next.board.length === 0) {
      next.board.push([tile[0], tile[1]]);
      next.startIdx = 0;
      next.leftVal = tile[0];
      next.rightVal = tile[1];
    } else if (side === 'left') {
      const oriented = tile[1] === next.leftVal ? [tile[0], tile[1]] : [tile[1], tile[0]];
      next.board.unshift(oriented);
      next.startIdx += 1;
      next.leftVal = oriented[0];
    } else {
      const oriented = tile[0] === next.rightVal ? [tile[0], tile[1]] : [tile[1], tile[0]];
      next.board.push(oriented);
      next.rightVal = oriented[1];
    }
    next.consecutivePasses = 0;
    if (hand.length === 0) {
      next.status = 'ended';
      next.winner = actor;
      next.endReason = 'domino';
      next.scores[actor] = (next.scores[actor] || 0) + 1;
    } else {
      next.turn = nextTurn(next, actor);
    }
    return next;
  }

  if (payload.action === 'draw') {
    if (!next.pile.length || hasMove(hand, next)) return room;
    hand.push(next.pile.pop());
    return next;
  }

  if (payload.action === 'pass') {
    if (next.pile.length > 0 || hasMove(hand, next)) return room;
    next.consecutivePasses += 1;
    if (next.consecutivePasses >= next.playerIds.length) {
      let minPips = Infinity;
      let winners = [];
      for (const pid of next.playerIds) {
        const s = pipSum(next.hands[pid] || []);
        if (s < minPips) {
          minPips = s;
          winners = [pid];
        } else if (s === minPips) {
          winners.push(pid);
        }
      }
      next.status = 'ended';
      next.endReason = 'blocked';
      if (winners.length === 1) {
        next.winner = winners[0];
        next.scores[winners[0]] = (next.scores[winners[0]] || 0) + 1;
      } else {
        next.winner = null;
      }
    } else {
      next.turn = nextTurn(next, actor);
    }
    return next;
  }

  return room;
}

export function sanitizeLocalRoom(room, roleId) {
  if (!room) return null;
  const others = room.playerIds.filter((id) => id !== roleId);
  const oppId = others[0] || roleId;
  const myHand = room.hands[roleId] || [];
  const oppHand = room.hands[oppId] || [];
  const canMove = hasMove(myHand, room);

  return {
    status: room.status,
    isHost: roleId === 'host',
    playerCount: room.playerIds.length,
    players: room.playerIds.map((id) => ({
      id,
      name: id === roleId ? 'You' : labelForLocalId(id),
      score: room.scores[id] || 0,
      tileCount: (room.hands[id] || []).length,
    })),
    board: room.board,
    startIdx: room.startIdx,
    leftVal: room.leftVal,
    rightVal: room.rightVal,
    pileCount: room.pile.length,
    turnUserId: room.turn,
    turnName: room.turn === roleId ? 'You' : labelForLocalId(room.turn),
    isMyTurn: room.status === 'playing' && room.turn === roleId,
    winnerUserId: room.winner,
    winnerName: room.winner ? (room.winner === roleId ? 'You' : labelForLocalId(room.winner)) : '',
    endReason: room.endReason,
    myId: roleId,
    myName: 'You',
    myScore: room.scores[roleId] || 0,
    myHand,
    opponentName: labelForLocalId(oppId),
    opponentScore: room.scores[oppId] || 0,
    opponentCount: oppHand.length,
    canPass: room.status === 'playing' && room.turn === roleId && room.pile.length === 0 && !canMove,
    canDraw: room.status === 'playing' && room.turn === roleId && room.pile.length > 0 && !canMove,
    lastReaction: room.lastReaction || null,
  };
}
