// Serverless Local-Network P2P Dominoes over WebRTC DataChannel (0 internet required)

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
    if (pc.connectionState === 'failed' || pc.connectionState === 'closed' || pc.connectionState === 'disconnected') {
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
    if (pc.connectionState === 'failed' || pc.connectionState === 'closed' || pc.connectionState === 'disconnected') {
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

// --- Authoritative Host Game Engine for Local P2P ---

function createShuffledDeck() {
  const deck = [];
  for (let i = 0; i <= 6; i++) {
    for (let j = i; j <= 6; j++) deck.push([i, j]);
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

export function createLocalRoomState(scores = { host: 0, guest: 0 }) {
  const deck = createShuffledDeck();
  const hostHand = deck.slice(0, 7);
  const guestHand = deck.slice(7, 14);
  const pile = deck.slice(14);

  let turn = 'host';
  let bestD = -1;
  for (const [a, b] of hostHand) {
    if (a === b && a > bestD) { bestD = a; turn = 'host'; }
  }
  for (const [a, b] of guestHand) {
    if (a === b && a > bestD) { bestD = a; turn = 'guest'; }
  }
  if (bestD === -1) {
    let bestS = -1;
    for (const [a, b] of hostHand) {
      if (a + b > bestS) { bestS = a + b; turn = 'host'; }
    }
    for (const [a, b] of guestHand) {
      if (a + b > bestS) { bestS = a + b; turn = 'guest'; }
    }
  }

  return {
    status: 'playing',
    hands: { host: hostHand, guest: guestHand },
    pile,
    board: [],
    startIdx: 0,
    leftVal: null,
    rightVal: null,
    turn,
    consecutivePasses: 0,
    winner: null,
    endReason: null,
    scores: { ...scores },
    lastReaction: null,
  };
}

export function applyLocalAction(room, actor, payload) {
  if (!room) return room;
  const next = {
    ...room,
    hands: { host: [...room.hands.host], guest: [...room.hands.guest] },
    pile: [...room.pile],
    board: [...room.board],
    scores: { ...room.scores },
  };

  if (payload.action === 'react') {
    next.lastReaction = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      userId: actor,
      name: actor === 'host' ? 'Host' : 'Friend',
      emoji: payload.emoji || '👏',
      at: Date.now(),
    };
    return next;
  }

  if (payload.action === 'rematch') {
    return createLocalRoomState(next.scores);
  }

  if (next.status !== 'playing' || next.turn !== actor) return room;

  const hand = next.hands[actor];
  const other = actor === 'host' ? 'guest' : 'host';

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
      next.scores[actor] += 1;
    } else {
      next.turn = other;
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
    if (next.consecutivePasses >= 2) {
      const hp = pipSum(next.hands.host);
      const gp = pipSum(next.hands.guest);
      next.status = 'ended';
      next.endReason = 'blocked';
      if (hp < gp) { next.winner = 'host'; next.scores.host += 1; }
      else if (gp < hp) { next.winner = 'guest'; next.scores.guest += 1; }
      else next.winner = null;
    } else {
      next.turn = other;
    }
    return next;
  }

  return room;
}

export function sanitizeLocalRoom(room, role) {
  if (!room) return null;
  const opp = role === 'host' ? 'guest' : 'host';
  const myHand = room.hands[role] || [];
  const oppHand = room.hands[opp] || [];
  const canMove = hasMove(myHand, room);
  return {
    status: room.status,
    board: room.board,
    startIdx: room.startIdx,
    leftVal: room.leftVal,
    rightVal: room.rightVal,
    pileCount: room.pile.length,
    isMyTurn: room.status === 'playing' && room.turn === role,
    winnerUserId: room.winner,
    endReason: room.endReason,
    myId: role,
    myName: 'You',
    myScore: room.scores[role] || 0,
    myHand,
    opponentName: 'Friend (Local)',
    opponentScore: room.scores[opp] || 0,
    opponentCount: oppHand.length,
    canPass: room.status === 'playing' && room.turn === role && room.pile.length === 0 && !canMove,
    canDraw: room.status === 'playing' && room.turn === role && room.pile.length > 0 && !canMove,
    lastReaction: room.lastReaction || null,
  };
}
