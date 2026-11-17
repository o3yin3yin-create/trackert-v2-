'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  WifiOff,
  Send,
  Loader2,
  Smile,
  Wifi,
  QrCode,
  Copy,
  Check,
  Bot,
  Users,
  ChevronLeft,
} from 'lucide-react';
import QRCode from 'qrcode';
import { apiFetch, getApiBaseUrl } from '@/lib/api';
import AvatarIcon from '@/components/AvatarIcon';
import LocalQrScanner from '@/components/LocalQrScanner';
import {
  applyLocalAction,
  createLocalHostPeer,
  createLocalJoinPeer,
  createLocalRoomState,
  sanitizeLocalRoom,
} from '@/lib/localDominoP2P';

const PV = [[], [4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]];
const PH = PV.slice();
PH[6] = [0, 1, 2, 6, 7, 8];

const DominoTile = React.memo(function DominoTile({ tile, horiz = false, animClass = '', animDelay = '', onClick }) {
  const pips = horiz ? PH : PV;
  return (
    <div
      className={`d2-tile${horiz ? ' h' : ''}${animClass ? ' ' + animClass : ''}`}
      style={animDelay ? { animationDelay: animDelay } : undefined}
      onClick={onClick}
    >
      <div className="d2-half">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className={pips[tile[0]].includes(i) ? 'd2-pip' : undefined} />
        ))}
      </div>
      <div className="d2-half">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className={pips[tile[1]].includes(i) ? 'd2-pip' : undefined} />
        ))}
      </div>
    </div>
  );
});

const DominoBack = React.memo(function DominoBack({ animClass = '', animDelay = '' }) {
  return (
    <div
      className={`d2-back${animClass ? ' ' + animClass : ''}`}
      style={animDelay ? { animationDelay: animDelay } : undefined}
    />
  );
});

function endsOf(chain) {
  return chain.length ? [chain[0][0], chain[chain.length - 1][1]] : null;
}

function canPlayOriginal(t, chain, anyStart, startD) {
  const e = endsOf(chain);
  if (!e) return anyStart || (t[0] === t[1] && t[0] === startD);
  return t.includes(e[0]) || t.includes(e[1]);
}

function canPlayOnline(t, chain) {
  const e = endsOf(chain);
  if (!e) return true;
  return t.includes(e[0]) || t.includes(e[1]);
}

function sumHand(h) {
  return h.reduce((s, t) => s + t[0] + t[1], 0);
}

// Strategic bot move picker for Easy / Medium / Hard
function pickBotMove(hand, chain, anyStart, startD, difficulty) {
  const e = endsOf(chain);
  const candidates = [];
  hand.forEach((t, i) => {
    if (!canPlayOriginal(t, chain, anyStart, startD)) return;
    if (!e) {
      candidates.push({ t, i, side: 'r' });
    } else {
      if (t.includes(e[1])) candidates.push({ t, i, side: 'r' });
      if (t.includes(e[0]) && e[0] !== e[1]) candidates.push({ t, i, side: 'l' });
    }
  });
  if (!candidates.length) return null;

  if (difficulty === 'easy') {
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  if (difficulty === 'medium') {
    candidates.sort((a, b) => b.t[0] + b.t[1] - (a.t[0] + a.t[1]));
    return candidates[0];
  }

  // Hard: count known pips (board + bot hand) to infer scarce numbers & keep flexible ends
  const seenCount = Array(7).fill(0);
  const handCount = Array(7).fill(0);
  chain.forEach(([a, b]) => {
    seenCount[a] += 1;
    if (a !== b) seenCount[b] += 1;
  });
  hand.forEach(([a, b]) => {
    seenCount[a] += 1;
    handCount[a] += 1;
    if (a !== b) {
      seenCount[b] += 1;
      handCount[b] += 1;
    }
  });

  let best = candidates[0];
  let bestScore = -Infinity;

  for (const cand of candidates) {
    const [a, b] = cand.t;
    const isDbl = a === b;
    const pipWeight = a + b;

    // Simulate resulting ends
    let newLeft = e ? e[0] : a;
    let newRight = e ? e[1] : b;
    if (e) {
      if (cand.side === 'r') newRight = a === e[1] ? b : a;
      else newLeft = b === e[0] ? a : b;
    }

    // Remaining hand counts after playing this tile
    const remLeft = handCount[newLeft] - (newLeft === a || newLeft === b ? 1 : 0);
    const remRight = handCount[newRight] - (newRight === a || newRight === b ? 1 : 0);

    // Higher score if we still hold matching numbers & opponent has fewer unseen tiles of those numbers
    const scarcityBonus = (seenCount[newLeft] + seenCount[newRight]) * 2.4;
    const flexibilityBonus = (remLeft > 0 ? 5 : 0) + (remRight > 0 ? 5 : 0);
    const doubleBonus = isDbl ? 4.5 : 0;

    const total = pipWeight * 0.9 + scarcityBonus + flexibilityBonus + doubleBonus;
    if (total > bestScore) {
      bestScore = total;
      best = cand;
    }
  }

  return best;
}

function createBotRoundState(lastWinner) {
  let all, p, c, d = -1;
  const anyStart = lastWinner !== null;
  do {
    all = [];
    for (let i = 0; i <= 6; i++) {
      for (let j = i; j <= 6; j++) all.push([i, j]);
    }
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    p = all.splice(0, 7);
    c = all.splice(0, 7);
    d = -1;
    [...p, ...c].forEach((t) => {
      if (t[0] === t[1] && t[0] > d) d = t[0];
    });
  } while (!anyStart && d < 0);

  const turn = anyStart ? lastWinner : p.some((t) => t[0] === d && t[1] === d) ? 'p' : 'c';
  const msg =
    turn === 'p'
      ? anyStart
        ? 'You won the last round — start with any tile'
        : 'You have the highest double — play it'
      : anyStart
        ? 'Opponent won the last round and starts'
        : 'Opponent starts with the highest double';

  return {
    p,
    c,
    pile: all,
    chain: [],
    startIdx: 0,
    startD: anyStart ? -1 : d,
    anyStart,
    turn,
    passes: 0,
    over: false,
    match: false,
    deal: true,
    newestIdx: -1,
    newPIdx: -1,
    cDrew: false,
    msg,
  };
}

// Exact snake geometry from Dominoes_2.html (perpendicular 90-degree corners)
function computeLayout(chain, startIdx, W, H) {
  if (!chain.length || !W || !H) return null;
  const T = 26;
  const Ln = 52;
  const g = 3;
  const Hx = Math.max(90, W / 2 - 30);
  const RS = Ln + 2 * g;
  const safeStart = Math.min(Math.max(0, startIdx), chain.length - 1);
  const st0 = chain[safeStart];
  const sd = st0[0] === st0[1];
  const s0 = (sd ? T : Ln) / 2 + g;

  function walk(tiles) {
    let p = { x: s0, y: 0 };
    let d = { x: 1, y: 0 };
    let hdir = 1;
    let rowY = 0;
    let bridge = false;
    let prevDbl = sd;
    const out = [];
    for (let idx = 0; idx < tiles.length; idx++) {
      const item = tiles[idx];
      const t = item.t;
      const dbl = t[0] === t[1];
      const len = dbl ? T : Ln;
      let cx, cy, ang;
      if (bridge) {
        hdir = -hdir;
        const sx = p.x - (hdir * T) / 2;
        cx = sx + (hdir * Ln) / 2;
        cy = rowY;
        p = { x: sx + hdir * (Ln + g), y: rowY };
        d = { x: hdir, y: 0 };
        ang = hdir > 0 ? 0 : Math.PI;
        bridge = false;
      } else if (Math.abs(p.x + d.x * len) > Hx && !prevDbl && !dbl) {
        const sy = rowY - T / 2;
        cx = p.x + d.x * (T / 2 + g);
        cy = sy + Ln / 2;
        rowY += RS;
        p = { x: cx, y: rowY };
        d = { x: 0, y: 1 };
        ang = Math.PI / 2;
        bridge = true;
      } else {
        cx = p.x + (d.x * len) / 2;
        cy = p.y;
        p = { x: p.x + d.x * (len + g), y: p.y };
        ang = d.x > 0 ? 0 : Math.PI;
        if (dbl) ang += Math.PI / 2;
      }
      prevDbl = dbl;
      out.push({ x: cx, y: cy, ang, t, chainIdx: item.idx });
    }
    return out;
  }

  const items = [
    {
      x: 0,
      y: 0,
      ang: sd ? Math.PI / 2 : 0,
      h: chain[safeStart],
      chainIdx: safeStart,
    },
  ];
  walk(chain.slice(safeStart + 1).map((t, k) => ({ t, idx: safeStart + 1 + k }))).forEach((o) =>
    items.push({ x: o.x, y: o.y, ang: o.ang, h: o.t, chainIdx: o.chainIdx })
  );
  walk(
    chain
      .slice(0, safeStart)
      .map((t, k) => ({ t, idx: k }))
      .reverse()
  ).forEach((o) =>
    items.push({
      x: -o.x,
      y: -o.y,
      ang: o.ang + Math.PI,
      h: [o.t[1], o.t[0]],
      chainIdx: o.chainIdx,
    })
  );

  let x0 = 1e9,
    x1 = -1e9,
    y0 = 1e9,
    y1 = -1e9;
  items.forEach((i) => {
    x0 = Math.min(x0, i.x - 30);
    x1 = Math.max(x1, i.x + 30);
    y0 = Math.min(y0, i.y - 30);
    y1 = Math.max(y1, i.y + 30);
  });
  const sc = Math.min(1, (W - 8) / (x1 - x0), (H - 8) / (y1 - y0));
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;

  return {
    items,
    scale: sc,
    layerTransform: `translate(${W / 2}px,${H / 2}px) scale(${sc}) translate(${-cx}px,${-cy}px)`,
  };
}

export default function DominoesEasterEggModal({
  open,
  onClose,
  friends = [],
  isSignedIn = false,
  initialRoomId = null,
}) {
  const isInvitedSession = Boolean(initialRoomId);

  // Navigation screen: 'menu' | 'bot_setup' | 'friend_setup' | 'local_setup' | 'game'
  const [screen, setScreen] = useState(initialRoomId ? 'game' : 'menu');
  const [mode, setMode] = useState(initialRoomId ? 'friend' : 'bot'); // 'bot' | 'friend' | 'local'
  const [botDifficulty, setBotDifficulty] = useState('medium'); // 'easy' | 'medium' | 'hard'
  const [exitPromptOpen, setExitPromptOpen] = useState(false);

  // Offline Bot state
  const [score, setScore] = useState({ p: 0, c: 0 });
  const [lastWinner, setLastWinner] = useState(null);
  const [S, setS] = useState(() => createBotRoundState(null));
  const [pending, setPending] = useState(null);

  // Online friend state (2-4 players)
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [onlineRoomId, setOnlineRoomId] = useState(initialRoomId || null);
  const [onlineState, setOnlineState] = useState(null);
  const [onlineError, setOnlineError] = useState('');
  const [invitingBusy, setInvitingBusy] = useState(false);
  const [joiningRoom, setJoiningRoom] = useState(false);
  const [onlinePending, setOnlinePending] = useState(null);
  const [reactionMenuOpen, setReactionMenuOpen] = useState(false);
  const [floatingReaction, setFloatingReaction] = useState(null);
  const lastReactionIdRef = useRef(null);
  const sseConnectedRef = useRef(false);

  // Local Wi-Fi / Hotspot P2P state (2-4 players, 0 internet)
  const [localStep, setLocalStep] = useState('idle'); // 'idle' | 'host_wait' | 'join_scan' | 'join_wait' | 'connected'
  const [localRole, setLocalRole] = useState(null); // 'host' | 'guest1' | 'guest2' | 'guest3'
  const [localConnectedIds, setLocalConnectedIds] = useState(['host']);
  const [localQrDataUrl, setLocalQrDataUrl] = useState('');
  const [localSignalCode, setLocalSignalCode] = useState('');
  const [localPasteInput, setLocalPasteInput] = useState('');
  const [localScanning, setLocalScanning] = useState(false);
  const [localCopied, setLocalCopied] = useState(false);
  const [localBusy, setLocalBusy] = useState(false);
  const [localError, setLocalError] = useState('');
  const localPeersRef = useRef({}); // roleId -> peer
  const localPendingPeerRef = useRef(null); // { roleId, peer }
  const localGuestPeerRef = useRef(null);
  const localRoomRef = useRef(null);

  // Board & flight refs
  const boardRef = useRef(null);
  const compHandRef = useRef(null);
  const layerRef = useRef(null);
  const flightRef = useRef(null);
  const pendingTileRectRef = useRef(null);
  const prevOnlineBoardRef = useRef({ len: 0, firstKey: '' });
  const [boardSize, setBoardSize] = useState({ w: 0, h: 0 });

  const botTimerRef = useRef(null);
  const sseRef = useRef(null);
  const activeRoomRef = useRef(null);
  const scoreRef = useRef(score);
  const lastWinnerRef = useRef(lastWinner);

  useEffect(() => {
    scoreRef.current = score;
    lastWinnerRef.current = lastWinner;
  }, [score, lastWinner]);

  useEffect(() => {
    activeRoomRef.current = onlineRoomId;
  }, [onlineRoomId]);

  useEffect(() => {
    if (!open || screen !== 'game') return;
    const measure = () => {
      if (boardRef.current) {
        setBoardSize({
          w: boardRef.current.clientWidth,
          h: boardRef.current.clientHeight,
        });
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [open, screen, mode, onlineState?.status]);

  const closeSse = useCallback(() => {
    if (sseRef.current) {
      try {
        sseRef.current.close();
      } catch (_) {}
      sseRef.current = null;
    }
  }, []);

  const leaveActiveRoom = useCallback(
    async (roomIdToLeave) => {
      const targetId = roomIdToLeave || activeRoomRef.current;
      closeSse();
      if (!targetId) return;
      try {
        await apiFetch('/api/domino', {
          method: 'POST',
          body: JSON.stringify({ action: 'leave', roomId: targetId }),
        });
      } catch (_) {}
    },
    [closeSse]
  );

  const closeLocalPeers = useCallback(() => {
    Object.values(localPeersRef.current).forEach((p) => p?.close?.());
    localPeersRef.current = {};
    localPendingPeerRef.current?.peer?.close?.();
    localPendingPeerRef.current = null;
    localGuestPeerRef.current?.close?.();
    localGuestPeerRef.current = null;
    localRoomRef.current = null;
    setLocalStep('idle');
    setLocalRole(null);
    setLocalConnectedIds(['host']);
    setLocalQrDataUrl('');
    setLocalSignalCode('');
    setLocalPasteInput('');
    setLocalScanning(false);
    setLocalBusy(false);
    setLocalError('');
  }, []);

  // Reset on open/close
  useEffect(() => {
    if (!open) {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
      leaveActiveRoom();
      closeLocalPeers();
      setOnlineRoomId(null);
      setOnlineState(null);
      setOnlineError('');
      setSelectedFriends([]);
      setPending(null);
      setOnlinePending(null);
      setExitPromptOpen(false);
      return;
    }

    if (initialRoomId) {
      setMode('friend');
      setScreen('friend_setup');
      setOnlineRoomId(initialRoomId);
      setOnlineError('');
      setPending(null);
      setOnlinePending(null);
      setExitPromptOpen(false);
    } else {
      setScreen('menu');
      setMode('bot');
      setScore({ p: 0, c: 0 });
      setLastWinner(null);
      setS(createBotRoundState(null));
      setPending(null);
      setOnlinePending(null);
      setExitPromptOpen(false);
      setSelectedFriends([]);
      setOnlineRoomId(null);
      setOnlineState(null);
      setOnlineError('');
    }
  }, [open, initialRoomId, leaveActiveRoom, closeLocalPeers]);

  // Connect SSE for online friend mode
  useEffect(() => {
    if (!open || mode !== 'friend' || !onlineRoomId) {
      closeSse();
      return;
    }

    let cancelled = false;
    const connect = async () => {
      setJoiningRoom(true);
      setOnlineError('');
      try {
        const res = await apiFetch('/api/domino', {
          method: 'POST',
          body: JSON.stringify({ action: 'join', roomId: onlineRoomId }),
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setOnlineError(
            data?.error === 'room_not_found'
              ? 'This match expired or was closed.'
              : 'Could not join match.'
          );
          setJoiningRoom(false);
          return;
        }
        if (data?.state) {
          setOnlineState(data.state);
          if (data.state.status === 'playing' || data.state.status === 'ended') {
            setScreen('game');
          }
        }
      } catch (_) {
        if (!cancelled) setOnlineError('Connection lost. Check your internet.');
      } finally {
        if (!cancelled) setJoiningRoom(false);
      }

      if (cancelled) return;
      const base = getApiBaseUrl();
      const token =
        typeof window !== 'undefined' ? localStorage.getItem('bokra_desktop_token') : null;
      const streamUrl = `${base}/api/domino/stream?roomId=${encodeURIComponent(onlineRoomId)}${
        token ? `&token=${encodeURIComponent(token)}` : ''
      }`;
      sseConnectedRef.current = false;
      try {
        const es = new EventSource(streamUrl, { withCredentials: true });
        sseRef.current = es;
        es.onopen = () => {
          sseConnectedRef.current = true;
        };
        es.onerror = () => {
          sseConnectedRef.current = false;
        };
        es.onmessage = (ev) => {
          sseConnectedRef.current = true;
          try {
            const parsed = JSON.parse(ev.data);
            if (parsed?.state) {
              setOnlineState(parsed.state);
              if (parsed.state.status === 'playing' || parsed.state.status === 'ended') {
                setScreen('game');
              }
            }
          } catch (_) {}
        };
      } catch (_) {}
    };

    connect();

    let tick = 0;
    const poll = setInterval(async () => {
      if (cancelled) return;
      tick += 1;
      if (sseConnectedRef.current && tick % 5 !== 0) return;
      try {
        const res = await apiFetch(`/api/domino?roomId=${encodeURIComponent(onlineRoomId)}`);
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (!cancelled && data?.state) {
            setOnlineState(data.state);
            if (data.state.status === 'playing' || data.state.status === 'ended') {
              setScreen('game');
            }
          }
        }
      } catch (_) {}
    }, 1000);

    return () => {
      cancelled = true;
      sseConnectedRef.current = false;
      clearInterval(poll);
      closeSse();
    };
  }, [open, mode, onlineRoomId, closeSse]);

  // Show incoming/outgoing reactions briefly
  useEffect(() => {
    const r = onlineState?.lastReaction;
    if (!r?.id || r.id === lastReactionIdRef.current) return;
    if (Date.now() - (r.at || 0) > 6000) {
      lastReactionIdRef.current = r.id;
      return;
    }
    lastReactionIdRef.current = r.id;
    setFloatingReaction(r);
    const t = setTimeout(() => setFloatingReaction(null), 2200);
    return () => clearTimeout(t);
  }, [onlineState?.lastReaction]);

  // Clear one-shot deal/rise flags
  useEffect(() => {
    if (S.deal || S.newPIdx !== -1 || S.cDrew) {
      const t = setTimeout(() => {
        setS((prev) =>
          prev.deal || prev.newPIdx !== -1 || prev.cDrew
            ? { ...prev, deal: false, newPIdx: -1, cDrew: false }
            : prev
        );
      }, 650);
      return () => clearTimeout(t);
    }
  }, [S.deal, S.newPIdx, S.cDrew]);

  // Bot turn runner (at least ~1.1s pause after player moves)
  useEffect(() => {
    if (!open || screen !== 'game' || mode !== 'bot') return;
    if (S.over || S.turn !== 'c') return;

    const delay = S.chain.length === 0 ? 1100 : S.cDrew ? 700 : 1100;
    botTimerRef.current = setTimeout(() => {
      const backEl = compHandRef.current?.lastElementChild || compHandRef.current?.firstElementChild;
      const oppFromRect = backEl?.getBoundingClientRect?.() || null;

      setS((prev) => {
        if (prev.over || prev.turn !== 'c') return prev;
        const choice = pickBotMove(prev.c, prev.chain, prev.anyStart, prev.startD, botDifficulty);

        if (choice) {
          const { t, i, side } = choice;
          const e = endsOf(prev.chain);
          const nextC = [...prev.c];
          nextC.splice(i, 1);
          const nextChain = [...prev.chain];
          let nextStartIdx = prev.startIdx;
          let newestIdx = 0;

          if (!nextChain.length) {
            nextChain.push(t);
            nextStartIdx = 0;
            newestIdx = 0;
          } else if (side === 'r') {
            const o = t[0] === e[1] ? t : [t[1], t[0]];
            nextChain.push(o);
            newestIdx = nextChain.length - 1;
          } else {
            const o = t[1] === e[0] ? t : [t[1], t[0]];
            nextChain.unshift(o);
            nextStartIdx++;
            newestIdx = 0;
          }

          if (oppFromRect) {
            flightRef.current = { fromRect: oppFromRect, isOpponent: true, targetIdx: newestIdx };
          }

          if (nextC.length === 0) {
            const pts = sumHand(prev.p);
            const nextScore = { ...scoreRef.current, c: scoreRef.current.c + pts };
            setScore(nextScore);
            setLastWinner('c');
            const isMatch = nextScore.p >= 100 || nextScore.c >= 100;
            const msg = isMatch
              ? `${nextScore.p >= nextScore.c ? 'You win the match' : 'Opponent wins the match'} · ${nextScore.p} to ${nextScore.c}`
              : `Opponent wins the round · +${pts}`;
            return {
              ...prev,
              c: nextC,
              chain: nextChain,
              startIdx: nextStartIdx,
              newestIdx,
              passes: 0,
              over: true,
              match: isMatch,
              cDrew: false,
              msg,
            };
          }

          return {
            ...prev,
            c: nextC,
            chain: nextChain,
            startIdx: nextStartIdx,
            newestIdx,
            passes: 0,
            turn: 'p',
            cDrew: false,
            msg: 'Your turn',
          };
        }

        if (prev.pile.length) {
          const nextPile = [...prev.pile];
          const drawn = nextPile.pop();
          return {
            ...prev,
            c: [...prev.c, drawn],
            pile: nextPile,
            cDrew: true,
            msg: 'Opponent draws',
          };
        }

        const nextPasses = prev.passes + 1;
        if (nextPasses >= 2) {
          const a = sumHand(prev.p);
          const b = sumHand(prev.c);
          let who = null;
          let pts = 0;
          let msg = 'Blocked — it\u2019s a draw, no points';
          if (a < b) {
            who = 'p';
            pts = b - a;
            msg = `Blocked — you win the round · +${pts}`;
          } else if (a > b) {
            who = 'c';
            pts = a - b;
            msg = `Blocked — opponent wins the round · +${pts}`;
          }
          const nextScore = { ...scoreRef.current };
          if (who) nextScore[who] += pts;
          setScore(nextScore);
          setLastWinner(who);
          const isMatch = nextScore.p >= 100 || nextScore.c >= 100;
          if (isMatch) {
            msg = `${nextScore.p >= nextScore.c ? 'You win the match' : 'Opponent wins the match'} · ${nextScore.p} to ${nextScore.c}`;
          }
          return {
            ...prev,
            passes: nextPasses,
            over: true,
            match: isMatch,
            cDrew: false,
            msg,
          };
        }

        return {
          ...prev,
          passes: nextPasses,
          turn: 'p',
          cDrew: false,
          msg: 'Opponent passed — your turn',
        };
      });
    }, delay);

    return () => {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
    };
  }, [open, screen, mode, botDifficulty, S.over, S.turn, S.c.length, S.pile.length, S.chain.length, S.cDrew]);

  const startNewGame = useCallback(() => {
    if (botTimerRef.current) clearTimeout(botTimerRef.current);
    setScore({ p: 0, c: 0 });
    setLastWinner(null);
    setPending(null);
    setS(createBotRoundState(null));
  }, []);

  const startNextRound = useCallback(() => {
    if (botTimerRef.current) clearTimeout(botTimerRef.current);
    setPending(null);
    setS(createBotRoundState(lastWinnerRef.current));
  }, []);

  const playerPlay = useCallback((i, side, explicitRect = null) => {
    const fromRect = explicitRect || pendingTileRectRef.current || null;
    pendingTileRectRef.current = null;
    setPending(null);
    setS((prev) => {
      const nextP = [...prev.p];
      const t = nextP.splice(i, 1)[0];
      const nextChain = [...prev.chain];
      let nextStartIdx = prev.startIdx;
      let newestIdx = 0;

      if (!nextChain.length) {
        nextChain.push(t);
        nextStartIdx = 0;
        newestIdx = 0;
      } else if (side === 'r') {
        const e = endsOf(nextChain);
        const o = t[0] === e[1] ? t : [t[1], t[0]];
        nextChain.push(o);
        newestIdx = nextChain.length - 1;
      } else {
        const e = endsOf(nextChain);
        const o = t[1] === e[0] ? t : [t[1], t[0]];
        nextChain.unshift(o);
        nextStartIdx++;
        newestIdx = 0;
      }

      if (fromRect) {
        flightRef.current = { fromRect, isOpponent: false, targetIdx: newestIdx };
      }

      if (nextP.length === 0) {
        const pts = sumHand(prev.c);
        const nextScore = { ...scoreRef.current, p: scoreRef.current.p + pts };
        setScore(nextScore);
        setLastWinner('p');
        const isMatch = nextScore.p >= 100 || nextScore.c >= 100;
        const msg = isMatch
          ? `${nextScore.p >= nextScore.c ? 'You win the match' : 'Opponent wins the match'} · ${nextScore.p} to ${nextScore.c}`
          : `You win the round · +${pts}`;
        return {
          ...prev,
          p: nextP,
          chain: nextChain,
          startIdx: nextStartIdx,
          newestIdx,
          passes: 0,
          over: true,
          match: isMatch,
          msg,
        };
      }

      return {
        ...prev,
        p: nextP,
        chain: nextChain,
        startIdx: nextStartIdx,
        newestIdx,
        passes: 0,
        turn: 'c',
        msg: 'Opponent\u2019s turn',
      };
    });
  }, []);

  const clickBotTile = (i, e) => {
    if (S.over || S.turn !== 'p') return;
    const t = S.p[i];
    if (!canPlayOriginal(t, S.chain, S.anyStart, S.startD)) return;
    const fromRect = e?.currentTarget?.getBoundingClientRect?.() || null;
    const ends = endsOf(S.chain);
    if (!ends) {
      playerPlay(i, 'r', fromRect);
      return;
    }
    const L = t.includes(ends[0]);
    const R = t.includes(ends[1]);
    if (L && R && ends[0] !== ends[1]) {
      pendingTileRectRef.current = fromRect;
      setPending(i);
      return;
    }
    playerPlay(i, R ? 'r' : 'l', fromRect);
  };

  const botDraw = () => {
    if (S.turn !== 'p' || !S.pile.length) return;
    setS((prev) => {
      if (!prev.pile.length) return prev;
      const nextPile = [...prev.pile];
      const drawn = nextPile.pop();
      const nextP = [...prev.p, drawn];
      return { ...prev, pile: nextPile, p: nextP, newPIdx: nextP.length - 1 };
    });
  };

  const botPass = () => {
    setPending(null);
    setS((prev) => {
      const nextPasses = prev.passes + 1;
      if (nextPasses >= 2) {
        const a = sumHand(prev.p);
        const b = sumHand(prev.c);
        let who = null;
        let pts = 0;
        let msg = 'Blocked — it\u2019s a draw, no points';
        if (a < b) {
          who = 'p';
          pts = b - a;
          msg = `Blocked — you win the round · +${pts}`;
        } else if (a > b) {
          who = 'c';
          pts = a - b;
          msg = `Blocked — opponent wins the round · +${pts}`;
        }
        const nextScore = { ...scoreRef.current };
        if (who) nextScore[who] += pts;
        setScore(nextScore);
        setLastWinner(who);
        const isMatch = nextScore.p >= 100 || nextScore.c >= 100;
        if (isMatch) {
          msg = `${nextScore.p >= nextScore.c ? 'You win the match' : 'Opponent wins the match'} · ${nextScore.p} to ${nextScore.c}`;
        }
        return { ...prev, passes: nextPasses, over: true, match: isMatch, msg };
      }
      return { ...prev, passes: nextPasses, turn: 'c', msg: 'Opponent\u2019s turn' };
    });
  };

  // --- LOCAL P2P (2-4 players) ---
  const broadcastLocalState = useCallback((room) => {
    localRoomRef.current = room;
    setOnlineState(sanitizeLocalRoom(room, 'host'));
    Object.entries(localPeersRef.current).forEach(([roleId, peer]) => {
      peer?.send?.({ type: 'state', state: sanitizeLocalRoom(room, roleId) });
    });
  }, []);

  const prepareNextLocalHostOffer = async (existingConnectedCount = null) => {
    const connectedCount =
      existingConnectedCount !== null ? existingConnectedCount : localConnectedIds.length;
    if (connectedCount >= 4) return;
    const nextGuestNum = connectedCount; // 1 -> guest1, 2 -> guest2, 3 -> guest3
    const nextRoleId = `guest${nextGuestNum}`;
    setLocalBusy(true);
    setLocalError('');
    setLocalRole('host');
    try {
      const peer = await createLocalHostPeer({
        onOpen: () => {
          localPeersRef.current[nextRoleId] = peer;
          localPendingPeerRef.current = null;
          setLocalConnectedIds((prev) =>
            prev.includes(nextRoleId) ? prev : [...prev, nextRoleId]
          );
          setLocalScanning(false);
          setLocalPasteInput('');
          setLocalQrDataUrl('');
          setLocalSignalCode('');
          setLocalStep('host_wait');
        },
        onMessage: (msg) => {
          if (msg?.type === 'action' && localRoomRef.current) {
            const updated = applyLocalAction(localRoomRef.current, nextRoleId, msg.payload);
            broadcastLocalState(updated);
          }
        },
        onClose: () => {
          delete localPeersRef.current[nextRoleId];
          setLocalConnectedIds((prev) => prev.filter((id) => id !== nextRoleId));
        },
      });
      localPendingPeerRef.current = { roleId: nextRoleId, peer };
      setLocalSignalCode(peer.offerCode);
      const qr = await QRCode.toDataURL(peer.offerCode, {
        width: 220,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
      });
      setLocalQrDataUrl(qr);
      setLocalStep('host_wait');
    } catch (_) {
      setLocalError('Could not start local host.');
    } finally {
      setLocalBusy(false);
    }
  };

  const acceptLocalAnswer = async (code) => {
    const pendingObj = localPendingPeerRef.current;
    if (!pendingObj?.peer || !code?.trim()) return;
    setLocalBusy(true);
    setLocalError('');
    try {
      await pendingObj.peer.acceptAnswer(code.trim());
    } catch (_) {
      setLocalError('Invalid code — scan or paste the Answer code.');
    } finally {
      setLocalBusy(false);
    }
  };

  const startLocalHostMatch = () => {
    if (localConnectedIds.length < 2) return;
    const fresh = createLocalRoomState(localConnectedIds);
    broadcastLocalState(fresh);
    setScreen('game');
  };

  const connectLocalAsGuest = async (offerCode) => {
    if (!offerCode?.trim()) return;
    closeLocalPeers();
    setLocalBusy(true);
    setLocalError('');
    setLocalRole('guest');
    try {
      const peer = await createLocalJoinPeer(offerCode.trim(), {
        onOpen: () => {
          setLocalStep('connected');
          setLocalScanning(false);
        },
        onMessage: (msg) => {
          if (msg?.type === 'state' && msg.state) {
            setOnlineState(msg.state);
            setScreen('game');
          }
        },
        onClose: () => {
          setLocalError('Host disconnected.');
          setLocalStep('idle');
          setOnlineState(null);
          setScreen('local_setup');
        },
      });
      localGuestPeerRef.current = peer;
      setLocalSignalCode(peer.answerCode);
      const qr = await QRCode.toDataURL(peer.answerCode, {
        width: 220,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
      });
      setLocalQrDataUrl(qr);
      setLocalStep('join_wait');
    } catch (_) {
      setLocalError('Invalid host code — try scanning again.');
    } finally {
      setLocalBusy(false);
    }
  };

  const copyLocalCode = async () => {
    if (!localSignalCode) return;
    try {
      await navigator.clipboard.writeText(localSignalCode);
      setLocalCopied(true);
      setTimeout(() => setLocalCopied(false), 1800);
    } catch (_) {}
  };

  // --- ONLINE FRIEND (2-4 players) ---
  const toggleFriendSelect = (username) => {
    setSelectedFriends((prev) => {
      if (prev.includes(username)) return prev.filter((u) => u !== username);
      if (prev.length >= 3) return prev;
      return [...prev, username];
    });
  };

  const handleInviteFriends = async () => {
    if (selectedFriends.length === 0 || invitingBusy) return;
    setInvitingBusy(true);
    setOnlineError('');
    try {
      const res = await apiFetch('/api/domino', {
        method: 'POST',
        timeoutMs: 25000,
        body: JSON.stringify({ action: 'create', targetUsernames: selectedFriends }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setOnlineError(
          data?.error === 'too_many_requests'
            ? 'Please wait a moment before inviting again.'
            : data?.error
              ? `Could not send invite (${data.error}).`
              : 'Could not send invite.'
        );
        return;
      }
      setOnlineRoomId(data.roomId);
      setOnlineState(data.state);
    } catch (err) {
      setOnlineError(
        err?.name === 'AbortError'
          ? 'Server took too long to respond. Try again.'
          : 'Failed to send invite. Check your connection.'
      );
    } finally {
      setInvitingBusy(false);
    }
  };

  const handleOnlineAction = async (payload) => {
    if (mode === 'local') {
      if (localRole === 'host' && localRoomRef.current) {
        const updated = applyLocalAction(localRoomRef.current, 'host', payload);
        broadcastLocalState(updated);
      } else {
        localGuestPeerRef.current?.send?.({ type: 'action', payload });
      }
      return;
    }
    if (!onlineRoomId) return;
    try {
      const res = await apiFetch('/api/domino', {
        method: 'POST',
        body: JSON.stringify({ roomId: onlineRoomId, ...payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.state) setOnlineState(data.state);
    } catch (_) {}
  };

  const clickOnlineTile = (i, ev) => {
    if (!onlineState?.isMyTurn) return;
    const t = onlineState.myHand[i];
    if (!canPlayOnline(t, onlineState.board)) return;
    const fromRect = ev?.currentTarget?.getBoundingClientRect?.() || null;
    const e = endsOf(onlineState.board);
    if (!e) {
      setOnlinePending(null);
      if (fromRect) {
        flightRef.current = { fromRect, isOpponent: false, targetIdx: 0 };
      }
      setOnlineState((prev) => {
        if (!prev) return prev;
        const nextHand = [...prev.myHand];
        nextHand.splice(i, 1);
        return {
          ...prev,
          myHand: nextHand,
          board: [[t[0], t[1]]],
          startIdx: 0,
          leftVal: t[0],
          rightVal: t[1],
          isMyTurn: false,
        };
      });
      handleOnlineAction({ action: 'play', tileIndex: i, side: 'left' });
      return;
    }
    const L = t.includes(e[0]);
    const R = t.includes(e[1]);
    if (L && R && e[0] !== e[1]) {
      pendingTileRectRef.current = fromRect;
      setOnlinePending(i);
      return;
    }
    const chosenSide = R ? 'right' : 'left';
    setOnlinePending(null);
    if (fromRect) {
      flightRef.current = {
        fromRect,
        isOpponent: false,
        targetIdx: chosenSide === 'left' ? 0 : onlineState.board.length,
      };
    }
    setOnlineState((prev) => {
      if (!prev) return prev;
      const nextHand = [...prev.myHand];
      const played = nextHand.splice(i, 1)[0];
      const nextBoard = [...prev.board];
      let nextStartIdx = prev.startIdx || 0;
      let nextLeft = prev.leftVal;
      let nextRight = prev.rightVal;
      if (chosenSide === 'left') {
        const oriented = played[1] === prev.leftVal ? [played[0], played[1]] : [played[1], played[0]];
        nextBoard.unshift(oriented);
        nextStartIdx += 1;
        nextLeft = oriented[0];
      } else {
        const oriented = played[0] === prev.rightVal ? [played[0], played[1]] : [played[1], played[0]];
        nextBoard.push(oriented);
        nextRight = oriented[1];
      }
      return {
        ...prev,
        myHand: nextHand,
        board: nextBoard,
        startIdx: nextStartIdx,
        leftVal: nextLeft,
        rightVal: nextRight,
        isMyTurn: false,
      };
    });
    handleOnlineAction({ action: 'play', tileIndex: i, side: chosenSide });
  };

  // --- EXIT / RESTART HANDLERS ---
  const handleBackToMenu = async () => {
    setExitPromptOpen(false);
    if (botTimerRef.current) clearTimeout(botTimerRef.current);
    if (onlineRoomId) {
      await leaveActiveRoom(onlineRoomId);
      setOnlineRoomId(null);
    }
    closeLocalPeers();
    setOnlineState(null);
    setOnlineError('');
    setSelectedFriends([]);
    setPending(null);
    setOnlinePending(null);
    setScreen('menu');
  };

  const handleRestartFromPrompt = () => {
    setExitPromptOpen(false);
    if (mode === 'bot') {
      startNewGame();
    } else if (onlineState?.isHost) {
      handleOnlineAction({ action: 'rematch' });
    }
  };

  const isMultiActiveBoard =
    (mode === 'friend' || mode === 'local') &&
    onlineState &&
    (onlineState.status === 'playing' || onlineState.status === 'ended');

  const activePlayerCount = mode === 'bot' ? 2 : onlineState?.playerCount || 2;
  const activeChain = mode === 'bot' ? S.chain : onlineState?.board || [];
  const activeStartIdx = mode === 'bot' ? S.startIdx : onlineState?.startIdx || 0;
  const activeHand = mode === 'bot' ? S.p : onlineState?.myHand || [];
  const activeOppCount = mode === 'bot' ? S.c.length : onlineState?.opponentCount || 0;
  const activePileCount = mode === 'bot' ? S.pile.length : onlineState?.pileCount || 0;

  const boardLayout = useMemo(
    () => computeLayout(activeChain, activeStartIdx, boardSize.w, boardSize.h),
    [activeChain, activeStartIdx, boardSize.w, boardSize.h]
  );

  // Tile flight animation (player hand -> board, or opponent -> board reveal)
  useLayoutEffect(() => {
    let flight = flightRef.current;
    flightRef.current = null;

    if (mode !== 'bot' && onlineState?.board) {
      const b = onlineState.board;
      const firstKey = b.length ? `${b[0][0]}-${b[0][1]}` : '';
      const prev = prevOnlineBoardRef.current;
      if (!flight && b.length === prev.len + 1) {
        const backEl =
          compHandRef.current?.lastElementChild || compHandRef.current?.firstElementChild;
        const fallbackRect = boardRef.current?.getBoundingClientRect?.() || null;
        const oppFromRect =
          backEl?.getBoundingClientRect?.() ||
          (fallbackRect
            ? { left: fallbackRect.left + fallbackRect.width / 2 - 13, top: 80, width: 26, height: 46 }
            : null);
        if (oppFromRect) {
          const targetIdx = prev.len === 0 || firstKey !== prev.firstKey ? 0 : b.length - 1;
          flight = { fromRect: oppFromRect, isOpponent: true, targetIdx };
        }
      }
      prevOnlineBoardRef.current = { len: b.length, firstKey };
    } else if (mode === 'bot') {
      prevOnlineBoardRef.current = { len: 0, firstKey: '' };
    }

    if (!flight || !layerRef.current) return;
    const posEl = layerRef.current.querySelector(`[data-chain-idx="${flight.targetIdx}"]`);
    if (!posEl) return;

    const toRect = posEl.getBoundingClientRect();
    if (!toRect.width || !toRect.height) return;

    const sc = boardLayout?.scale || 1;
    const dx =
      (flight.fromRect.left + flight.fromRect.width / 2 - (toRect.left + toRect.width / 2)) / sc;
    const dy =
      (flight.fromRect.top + flight.fromRect.height / 2 - (toRect.top + toRect.height / 2)) / sc;
    const ang = posEl.getAttribute('data-ang') || '0';

    try {
      if (flight.isOpponent) {
        posEl.animate(
          [
            {
              transform: `translate(${dx}px, ${dy}px) translate(-50%, -50%) rotate(${ang}rad) perspective(500px) rotateY(180deg) scale(1.25)`,
              opacity: 0.4,
            },
            {
              transform: `translate(${dx * 0.4}px, ${dy * 0.4}px) translate(-50%, -50%) rotate(${ang}rad) perspective(500px) rotateY(40deg) scale(1.15)`,
              opacity: 1,
              offset: 0.5,
            },
            {
              transform: `translate(0px, 0px) translate(-50%, -50%) rotate(${ang}rad) perspective(500px) rotateY(0deg) scale(1)`,
              opacity: 1,
            },
          ],
          { duration: 360, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
        );
      } else {
        posEl.animate(
          [
            {
              transform: `translate(${dx}px, ${dy}px) translate(-50%, -50%) rotate(0rad) scale(1.2)`,
              opacity: 0.85,
            },
            {
              transform: `translate(0px, 0px) translate(-50%, -50%) rotate(${ang}rad) scale(1)`,
              opacity: 1,
            },
          ],
          { duration: 260, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
        );
      }
    } catch (_) {}
  }, [activeChain, mode, onlineState?.board, boardLayout?.scale]);

  const botStatusText = useMemo(() => {
    if (S.over || S.turn !== 'p' || !S.chain.length) return S.msg;
    if (pending !== null) return 'Choose which end to play';
    if (!S.p.some((t) => canPlayOriginal(t, S.chain, S.anyStart, S.startD))) {
      return S.pile.length ? 'No matching tile — draw from the pile' : 'Nothing left to draw — pass';
    }
    return S.msg;
  }, [S, pending]);

  const friendStatusText = useMemo(() => {
    if (!onlineState) return '';
    if (onlineState.status === 'ended') {
      if (onlineState.winnerUserId === onlineState.myId) {
        return onlineState.endReason === 'blocked' ? 'Blocked — you win' : 'You win';
      }
      if (onlineState.winnerUserId) {
        const wName = onlineState.winnerName || onlineState.opponentName;
        return onlineState.endReason === 'blocked' ? `Blocked — ${wName} wins` : `${wName} wins`;
      }
      return 'Blocked — it\u2019s a draw';
    }
    if (onlinePending !== null) return 'Choose which end to play';
    if (onlineState.isMyTurn && onlineState.board.length > 0) {
      if (onlineState.canDraw) return 'No matching tile — draw from the pile';
      if (onlineState.canPass) return 'Nothing left to draw — pass';
    }
    const turnLabel = onlineState.turnName || onlineState.opponentName;
    return onlineState.isMyTurn ? 'Your turn' : `${turnLabel}\u2019s turn`;
  }, [onlineState, onlinePending]);

  if (!open) return null;

  const botEnds = endsOf(S.chain);
  const onlineEnds = endsOf(onlineState?.board || []);
  const showLoserGg =
    screen === 'game' &&
    ((mode === 'bot' && S.over && lastWinner === 'c') ||
      ((mode === 'friend' || mode === 'local') &&
        onlineState?.status === 'ended' &&
        Boolean(onlineState?.winnerUserId) &&
        onlineState.winnerUserId !== onlineState.myId));

  return (
    <div className="d2-root" role="dialog" aria-modal="true" aria-label="Dominoes">
      <style>{`
        .d2-root {
          --bg: #000;
          --fg: #fff;
          position: fixed;
          inset: 0;
          z-index: 20000;
          background: var(--bg);
          color: var(--fg);
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, "Segoe UI", sans-serif;
          display: flex;
          flex-direction: column;
          user-select: none;
          -webkit-user-select: none;
          touch-action: manipulation;
          -webkit-font-smoothing: antialiased;
          padding-top: calc(env(safe-area-inset-top, 0px) + 18px);
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
        .d2-root * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        #d2-top {
          padding: 20px 16px 0;
          text-align: center;
          position: relative;
          min-height: 60px;
        }
        .d2-pile-dots {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-bottom: 14px;
          min-height: 10px;
        }
        .d2-pile-dot {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.78);
          transition: opacity 0.25s ease, transform 0.25s ease;
        }
        .d2-pile-dot.gone {
          opacity: 0;
          transform: scale(0);
        }
        .d2-close-btn {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 36px;
          height: 36px;
          padding: 0;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.72);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 25;
        }
        .d2-back-btn {
          position: absolute;
          top: 16px;
          left: 16px;
          width: 36px;
          height: 36px;
          padding: 0;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.72);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 25;
        }
        .d2-react-btn {
          position: absolute;
          top: 16px;
          left: 16px;
          width: 36px;
          height: 36px;
          padding: 0;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.72);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 25;
        }
        .d2-react-tray {
          position: absolute;
          top: 58px;
          left: 16px;
          z-index: 26;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 6px;
          border-radius: 999px;
          background: rgba(18, 18, 20, 0.94);
          border: 1px solid rgba(255, 255, 255, 0.14);
          backdrop-filter: blur(12px);
        }
        .d2-react-chip {
          width: 32px;
          height: 32px;
          border-radius: 999px;
          border: none;
          background: transparent;
          font-size: 17px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.12s ease, background 0.12s ease;
        }
        .d2-react-chip:active {
          transform: scale(0.88);
          background: rgba(255, 255, 255, 0.1);
        }
        .d2-react-toast {
          position: absolute;
          top: 18px;
          left: 60px;
          z-index: 25;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 11px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.15);
          font-size: 12px;
          color: rgba(255, 255, 255, 0.9);
          pointer-events: none;
          animation: d2enter 0.25s ease-out both;
        }
        .d2-row { display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; }
        #d2-comp { min-height: 44px; }
        #d2-info { font-size: 13px; margin-top: 12px; opacity: .55; letter-spacing: -.08px; }
        #d2-board { flex: 1; position: relative; min-height: 0; overflow: hidden; }
        #d2-layer { position: absolute; left: 0; top: 0; transform-origin: 0 0; }
        .d2-pos { position: absolute; width: 52px; height: 26px; }
        #d2-bottom { padding: 0 16px 12px; text-align: center; }
        #d2-status { font-size: 13px; font-weight: 500; letter-spacing: -.08px; opacity: .55; min-height: 20px; margin-bottom: 16px; }
        .d2-fade { animation: d2fade .3s ease-out both; }
        .d2-tile {
          display: flex;
          flex-direction: column;
          width: 40px;
          height: 74px;
          border: 1px solid var(--fg);
          border-radius: 8px;
          background: var(--bg);
          flex: none;
        }
        .d2-tile.h { flex-direction: row; width: 52px; height: 26px; border-radius: 6px; }
        .d2-half { flex: 1; display: grid; grid-template: repeat(3,1fr)/repeat(3,1fr); padding: 4px; }
        .d2-half + .d2-half { border-top: 1px solid var(--fg); }
        .d2-tile.h .d2-half { padding: 2px; }
        .d2-tile.h .d2-half + .d2-half { border-top: 0; border-left: 1px solid var(--fg); }
        .d2-pip { width: 6px; height: 6px; border-radius: 50%; background: var(--fg); place-self: center; }
        .d2-tile.h .d2-pip { width: 4px; height: 4px; }
        .d2-back { width: 26px; height: 46px; border-radius: 6px; background: var(--fg); position: relative; }
        .d2-back::after { content: ""; position: absolute; left: 4px; right: 4px; top: 50%; height: 1px; background: var(--bg); opacity: .5; }
        .d2-mine { margin-bottom: 20px; gap: 5px; }
        .d2-mine .d2-tile { width: 34px; height: 64px; border-radius: 7px; cursor: pointer; touch-action: manipulation; transition: transform .1s ease; }
        .d2-mine .d2-half { padding: 3px; }
        .d2-mine .d2-pip { width: 5px; height: 5px; }
        .d2-mine .d2-tile:active { transform: scale(.94); }
        .d2-bar { display: flex; gap: 8px; justify-content: center; align-items: center; min-height: 44px; }
        .d2-btn {
          font: inherit;
          font-size: 17px;
          font-weight: 600;
          letter-spacing: -.4px;
          height: 44px;
          padding: 0 24px;
          border: 0;
          border-radius: 22px;
          cursor: pointer;
          background: var(--fg);
          color: var(--bg);
          transition: transform .15s ease, opacity .15s ease;
        }
        .d2-btn:active { transform: scale(.95); opacity: .8; }
        .d2-btn.plain { background: transparent; color: var(--fg); font-weight: 500; opacity: .65; }
        .d2-enter { animation: d2enter .5s cubic-bezier(.2,.9,.3,1.15) both; }
        .d2-rise { animation: d2enter .35s cubic-bezier(.2,.9,.3,1.1) both; }
        @keyframes d2enter { from { opacity: 0; transform: translateY(18px) scale(.9); } to { opacity: 1; transform: none; } }
        @keyframes d2fade { from { opacity: 0; transform: translateY(4px); } to { opacity: .55; transform: none; } }
        @keyframes d2ggOverlay {
          0% { opacity: 0; backdrop-filter: blur(0px); }
          14% { opacity: 1; backdrop-filter: blur(6px); }
          80% { opacity: 1; backdrop-filter: blur(6px); }
          100% { opacity: 0; backdrop-filter: blur(0px); }
        }
        @keyframes d2ggCharL {
          0% { opacity: 0; transform: translateY(-48px) scale(1.7) rotate(-14deg); filter: blur(10px); }
          24% { opacity: 1; transform: translateY(6px) scale(0.94) rotate(3deg); filter: blur(0px); }
          36% { opacity: 1; transform: translateY(0) scale(1.03) rotate(-1deg); }
          46% { opacity: 1; transform: translateY(0) scale(1) rotate(0deg); }
          82% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0px); }
          100% { opacity: 0; transform: translateY(-10px) scale(1.08); filter: blur(6px); }
        }
        @keyframes d2ggCharR {
          0%, 8% { opacity: 0; transform: translateY(48px) scale(1.7) rotate(14deg); filter: blur(10px); }
          32% { opacity: 1; transform: translateY(-6px) scale(0.94) rotate(-3deg); filter: blur(0px); }
          44% { opacity: 1; transform: translateY(0) scale(1.03) rotate(1deg); }
          54% { opacity: 1; transform: translateY(0) scale(1) rotate(0deg); }
          82% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0px); }
          100% { opacity: 0; transform: translateY(-10px) scale(1.08); filter: blur(6px); }
        }
        @keyframes d2ggRing {
          0%, 16% { opacity: 0; transform: scale(0.25); border-width: 2.5px; }
          28% { opacity: 0.55; }
          65% { opacity: 0; transform: scale(2.4); border-width: 0.5px; }
          100% { opacity: 0; transform: scale(2.4); }
        }
        @keyframes d2ggRing2 {
          0%, 24% { opacity: 0; transform: scale(0.2); border-width: 2px; }
          36% { opacity: 0.35; }
          74% { opacity: 0; transform: scale(2.8); border-width: 0.5px; }
          100% { opacity: 0; transform: scale(2.8); }
        }
        @keyframes d2ggSpark {
          0%, 20% { opacity: 0; transform: translate(0, 0) scale(0); }
          32% { opacity: 0.9; transform: translate(calc(var(--tx) * 0.45), calc(var(--ty) * 0.45)) scale(1.2); }
          68% { opacity: 0; transform: translate(var(--tx), var(--ty)) scale(0.3); }
          100% { opacity: 0; }
        }
        @keyframes d2ggSub {
          0%, 30% { opacity: 0; transform: translateY(8px); letter-spacing: 0.25em; }
          48% { opacity: 0.55; transform: translateY(0); letter-spacing: 0.14em; }
          80% { opacity: 0.55; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-4px); }
        }
        .d2-gg-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at center, rgba(0, 0, 0, 0.72) 0%, rgba(0, 0, 0, 0.35) 70%, transparent 100%);
          pointer-events: none;
          z-index: 30;
          animation: d2ggOverlay 3.1s ease-out forwards;
        }
        .d2-gg-stage {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 2px;
        }
        .d2-gg-ring {
          position: absolute;
          width: 110px;
          height: 110px;
          border-radius: 999px;
          border: 1.5px solid rgba(255, 255, 255, 0.65);
          animation: d2ggRing 3.1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .d2-gg-ring2 {
          position: absolute;
          width: 110px;
          height: 110px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.4);
          animation: d2ggRing2 3.1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .d2-gg-spark {
          position: absolute;
          width: 5px;
          height: 5px;
          border-radius: 999px;
          background: #ffffff;
          box-shadow: 0 0 8px rgba(255, 255, 255, 0.6);
          animation: d2ggSpark 3.1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .d2-gg-char {
          font-size: 96px;
          font-weight: 800;
          line-height: 1.25;
          padding-bottom: 8px;
          color: #ffffff;
          letter-spacing: -0.06em;
          text-shadow: 0 8px 32px rgba(255, 255, 255, 0.22);
          display: inline-block;
        }
        .d2-gg-char-l { animation: d2ggCharL 3.1s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .d2-gg-char-r { animation: d2ggCharR 3.1s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .d2-gg-sub {
          margin-top: 16px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          color: #ffffff;
          animation: d2ggSub 3.1s ease-out forwards;
        }
        @media (prefers-reduced-motion: reduce) { .d2-root * { animation: none !important; transition: none !important; } }
        .d2-lobby {
          width: 100%;
          max-width: 360px;
          margin: 0 auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .d2-card-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 18px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.11);
          color: #fff;
          cursor: pointer;
          transition: background 0.15s ease, transform 0.12s ease;
        }
        .d2-card-btn:active { transform: scale(0.98); background: rgba(255, 255, 255, 0.09); }
        .d2-friend-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 11px 14px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          cursor: pointer;
        }
        .d2-friend-row.selected {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 255, 255, 0.35);
        }
        .d2-invite-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 13px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.22);
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
        }
      `}</style>

      {/* Top */}
      <div id="d2-top">
        {screen !== 'menu' && screen !== 'game' && !isInvitedSession && (
          <button
            type="button"
            className="d2-back-btn"
            onClick={() => {
              if (screen === 'local_setup') closeLocalPeers();
              setScreen(screen === 'local_setup' ? 'friend_setup' : 'menu');
            }}
            aria-label="Back"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        <button
          type="button"
          className="d2-close-btn"
          onClick={() => {
            if (screen === 'game') {
              setExitPromptOpen(true);
            } else {
              onClose();
            }
          }}
          aria-label="Close Dominoes"
        >
          <X className="w-4 h-4" />
        </button>

        {screen === 'game' && (mode === 'friend' || mode === 'local') && isMultiActiveBoard && (
          <>
            <button
              type="button"
              className="d2-react-btn"
              onClick={() => setReactionMenuOpen((v) => !v)}
              aria-label="Send reaction"
            >
              <Smile className="w-4 h-4" />
            </button>

            {reactionMenuOpen && (
              <div className="d2-react-tray">
                {['👏', '🔥', '😂', '😮', '💀'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="d2-react-chip"
                    onClick={() => {
                      setReactionMenuOpen(false);
                      handleOnlineAction({ action: 'react', emoji });
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {floatingReaction && (
              <div className="d2-react-toast">
                <span>{floatingReaction.emoji}</span>
                <span className="text-[11px] text-white/75">
                  {floatingReaction.userId === onlineState?.myId
                    ? 'You'
                    : floatingReaction.name}
                </span>
              </div>
            )}
          </>
        )}

        {screen === 'game' && (mode === 'bot' || isMultiActiveBoard) && (
          <>
            {/* 14-dot pile visual ONLY for 2-player matches */}
            {activePlayerCount === 2 && (
              <div className="d2-pile-dots" aria-label={`Pile ${activePileCount}`}>
                {Array.from({ length: 14 }).map((_, idx) => (
                  <span
                    key={idx}
                    className={`d2-pile-dot${idx >= activePileCount ? ' gone' : ''}`}
                  />
                ))}
              </div>
            )}

            {/* Opponent white backs ONLY for 2-player matches */}
            {activePlayerCount === 2 && (
              <div
                className="d2-row"
                id="d2-comp"
                ref={compHandRef}
                style={{ gap: activeOppCount > 9 ? '-12px' : '6px' }}
              >
                {Array.from({ length: activeOppCount }).map((_, i) => {
                  let animClass = '';
                  let animDelay = '';
                  if (mode === 'bot') {
                    if (S.deal) {
                      animClass = 'd2-enter';
                      animDelay = `${i * 50}ms`;
                    } else if (S.cDrew && i === activeOppCount - 1) {
                      animClass = 'd2-rise';
                    }
                  }
                  return <DominoBack key={i} animClass={animClass} animDelay={animDelay} />;
                })}
              </div>
            )}

            <div id="d2-info" style={activePlayerCount >= 3 ? { marginTop: '4px' } : undefined}>
              {mode === 'bot' ? (
                `You ${score.p}  ·  Opponent ${score.c}`
              ) : activePlayerCount === 2 ? (
                `You ${onlineState.myScore}  ·  ${onlineState.opponentName} ${onlineState.opponentScore}`
              ) : (
                `${activePlayerCount} Players  ·  You ${onlineState.myScore}`
              )}
            </div>
          </>
        )}
      </div>

      {/* Main Content */}
      <div id="d2-board" ref={boardRef}>
        {screen === 'menu' && (
          <div className="h-full flex items-center justify-center px-5">
            <div className="d2-lobby items-center text-center">
              <div className="mb-4">
                <div className="text-3xl font-bold tracking-tight text-white">Dominoes</div>
                <p className="text-xs text-white/45 mt-1">Choose how you want to play</p>
              </div>

              <button
                type="button"
                className="d2-card-btn"
                onClick={() => {
                  setMode('bot');
                  setScreen('bot_setup');
                }}
              >
                <div className="flex items-center gap-3.5 text-left">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">vs Bot</div>
                    <div className="text-xs text-white/45">Offline · Easy, Medium or Hard</div>
                  </div>
                </div>
                <span className="text-white/35 text-sm">→</span>
              </button>

              <button
                type="button"
                className="d2-card-btn"
                onClick={() => {
                  setMode('friend');
                  setScreen('friend_setup');
                }}
              >
                <div className="flex items-center gap-3.5 text-left">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">vs Friend</div>
                    <div className="text-xs text-white/45">2–4 Players · Online or Local Wi-Fi</div>
                  </div>
                </div>
                <span className="text-white/35 text-sm">→</span>
              </button>
            </div>
          </div>
        )}

        {screen === 'bot_setup' && (
          <div className="h-full flex items-center justify-center px-5">
            <div className="d2-lobby items-center text-center">
              <div className="mb-3">
                <div className="text-xl font-bold text-white">Select Difficulty</div>
                <p className="text-xs text-white/45 mt-1">1v1 against the Bot (Offline)</p>
              </div>

              {[
                { id: 'easy', title: 'Easy', desc: 'Casual — random plays' },
                { id: 'medium', title: 'Medium', desc: 'Balanced — plays highest pips' },
                { id: 'hard', title: 'Hard', desc: 'Strategic — tracks board & blocks ends' },
              ].map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  className={`d2-card-btn ${botDifficulty === lvl.id ? '!bg-white/15 !border-white/40' : ''}`}
                  onClick={() => setBotDifficulty(lvl.id)}
                >
                  <div className="text-left">
                    <div className="text-sm font-semibold text-white">{lvl.title}</div>
                    <div className="text-xs text-white/45">{lvl.desc}</div>
                  </div>
                  {botDifficulty === lvl.id && <Check className="w-4 h-4 text-white" />}
                </button>
              ))}

              <button
                type="button"
                className="d2-btn mt-3 w-full"
                onClick={() => {
                  setMode('bot');
                  startNewGame();
                  setScreen('game');
                }}
              >
                Start Match
              </button>
            </div>
          </div>
        )}

        {screen === 'friend_setup' && (
          <div className="h-full flex items-center justify-center overflow-y-auto">
            <div className="d2-lobby">
              {joiningRoom ? (
                <div className="flex flex-col items-center gap-3 py-8 text-white/60 text-sm">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Joining match…</span>
                </div>
              ) : onlineError ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <p className="text-sm text-white/75">{onlineError}</p>
                  {!isInvitedSession && (
                    <button
                      type="button"
                      className="d2-btn"
                      onClick={() => {
                        setOnlineError('');
                        setOnlineRoomId(null);
                        setOnlineState(null);
                      }}
                    >
                      Back
                    </button>
                  )}
                </div>
              ) : onlineState?.status === 'waiting' ? (
                <div className="flex flex-col items-center gap-4 py-6 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-white/70" />
                  <div>
                    <p className="text-sm font-medium text-white">Waiting Room</p>
                    <p className="text-xs text-white/45 mt-1">
                      {onlineState.players?.filter((p) => p.joined).length || 1} / {onlineState.invitedCount || 2} joined
                    </p>
                  </div>

                  <div className="w-full flex flex-col gap-2">
                    {(onlineState.players || []).map((p) => (
                      <div key={p.id} className="d2-friend-row !cursor-default">
                        <span className="text-sm text-white">{p.name}</span>
                        <span className="text-xs text-white/50">{p.joined ? 'Ready' : 'Invited…'}</span>
                      </div>
                    ))}
                  </div>

                  {onlineState.isHost && (onlineState.players?.filter((p) => p.joined).length || 0) >= 2 && (
                    <button
                      type="button"
                      className="d2-btn w-full"
                      onClick={() => handleOnlineAction({ action: 'start' })}
                    >
                      Start Match ({onlineState.players.filter((p) => p.joined).length} Players)
                    </button>
                  )}

                  <button
                    type="button"
                    className="d2-btn plain"
                    onClick={async () => {
                      await leaveActiveRoom(onlineRoomId);
                      setOnlineRoomId(null);
                      setOnlineState(null);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : onlineState?.status === 'cancelled' ? (
                <div className="flex flex-col items-center gap-4 py-8 text-center">
                  <p className="text-sm text-white/75">Match was closed.</p>
                  {!isInvitedSession && (
                    <button
                      type="button"
                      className="d2-btn plain"
                      onClick={() => {
                        setOnlineRoomId(null);
                        setOnlineState(null);
                      }}
                    >
                      Back
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Local Wi-Fi / Hotspot option inside vs Friend */}
                  <button
                    type="button"
                    className="d2-card-btn mb-2"
                    onClick={() => {
                      setMode('local');
                      setScreen('local_setup');
                    }}
                  >
                    <div className="flex items-center gap-3 text-left">
                      <Wifi className="w-4 h-4 text-white/75" />
                      <div>
                        <div className="text-sm font-semibold text-white">Local Wi-Fi / Hotspot</div>
                        <div className="text-[11px] text-white/45">Offline · 2–4 devices nearby</div>
                      </div>
                    </div>
                    <span className="text-white/35 text-sm">→</span>
                  </button>

                  {!isSignedIn ? (
                    <div className="flex flex-col items-center gap-2 py-6 text-center text-white/55 text-sm">
                      <WifiOff className="w-5 h-5 mb-1" />
                      <span>Sign in to invite online friends.</span>
                    </div>
                  ) : friends.length === 0 ? (
                    <div className="text-center py-6 text-white/50 text-sm">
                      Add friends in bokra first to invite them online.
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs text-white/45">
                          Online · Select 1–3 friends ({selectedFriends.length}/3)
                        </span>
                      </div>
                      <div className="flex flex-col gap-2 max-h-[42vh] overflow-y-auto pr-0.5">
                        {friends.map((f) => {
                          const u = f?.user || {};
                          const username = u.username;
                          if (!username) return null;
                          const isSelected = selectedFriends.includes(username);
                          return (
                            <button
                              key={f.friendshipId || username}
                              type="button"
                              onClick={() => toggleFriendSelect(username)}
                              className={`d2-friend-row text-left ${isSelected ? 'selected' : ''}`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-full bg-white/10 border border-white/15 flex items-center justify-center overflow-hidden shrink-0">
                                  <AvatarIcon
                                    name={u.avatar || 'user'}
                                    size={u.avatar && (u.avatar.startsWith('data:') || u.avatar.startsWith('http')) ? undefined : 18}
                                    className="w-full h-full object-cover text-white/80"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-white truncate">
                                    {u.name || username}
                                  </div>
                                  <div className="text-[11px] text-white/40 truncate">@{username}</div>
                                </div>
                              </div>
                              <div
                                className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                  isSelected
                                    ? 'bg-white border-white text-black'
                                    : 'border-white/25 text-transparent'
                                }`}
                              >
                                <Check className="w-3 h-3" />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        className="d2-btn w-full mt-2 flex items-center justify-center gap-2 disabled:opacity-40"
                        disabled={selectedFriends.length === 0 || invitingBusy}
                        onClick={handleInviteFriends}
                      >
                        {invitingBusy ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        <span>
                          {invitingBusy
                            ? 'Sending…'
                            : `Invite (${selectedFriends.length + 1} Players)`}
                        </span>
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {screen === 'local_setup' && (
          <div className="h-full flex items-center justify-center overflow-y-auto">
            <div className="d2-lobby items-center text-center">
              {localError && <p className="text-xs text-red-400/90 mb-1">{localError}</p>}

              {localStep === 'idle' && !localScanning && (
                <div className="flex flex-col items-center gap-3 w-full py-4">
                  <Wifi className="w-6 h-6 text-white/60 mb-1" />
                  <p className="text-xs text-white/50 max-w-[260px]">
                    2–4 players on the same Wi-Fi or Hotspot. Zero internet required.
                  </p>
                  <div className="flex gap-3 mt-2">
                    <button
                      type="button"
                      className="d2-btn !text-sm !h-10 !px-5"
                      disabled={localBusy}
                      onClick={() => prepareNextLocalHostOffer(1)}
                    >
                      {localBusy ? 'Starting…' : 'Host Match'}
                    </button>
                    <button
                      type="button"
                      className="d2-btn plain !text-sm !h-10 !px-5 border border-white/20"
                      onClick={() => {
                        setLocalError('');
                        setLocalStep('join_scan');
                        setLocalScanning(true);
                      }}
                    >
                      Join Match
                    </button>
                  </div>
                </div>
              )}

              {localStep === 'host_wait' && (
                <div className="flex flex-col items-center gap-3 w-full py-2">
                  <div className="text-xs text-white/60">
                    Connected: <b>{localConnectedIds.length} / 4</b> players
                  </div>

                  {localConnectedIds.length >= 2 && !localQrDataUrl && !localScanning && (
                    <div className="flex flex-col gap-2 w-full max-w-[260px]">
                      <button
                        type="button"
                        className="d2-btn w-full"
                        onClick={startLocalHostMatch}
                      >
                        Start Match ({localConnectedIds.length} Players)
                      </button>
                      {localConnectedIds.length < 4 && (
                        <button
                          type="button"
                          className="d2-invite-btn justify-center"
                          onClick={() => prepareNextLocalHostOffer(localConnectedIds.length)}
                        >
                          + Add Player ({localConnectedIds.length + 1}/4)
                        </button>
                      )}
                    </div>
                  )}

                  {localQrDataUrl && !localScanning && (
                    <>
                      <p className="text-xs text-white/55">
                        Player {localConnectedIds.length + 1}: scan this QR in <b>Join Match</b>
                      </p>
                      <div className="p-2.5 rounded-2xl bg-white">
                        <img src={localQrDataUrl} alt="Host QR" className="w-44 h-44 block" />
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" className="d2-invite-btn" onClick={copyLocalCode}>
                          {localCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{localCopied ? 'Copied' : 'Copy code'}</span>
                        </button>
                        <button
                          type="button"
                          className="d2-btn !text-xs !h-8 !px-4 flex items-center gap-1.5"
                          onClick={() => setLocalScanning(true)}
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>Scan Friend QR</span>
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 w-full max-w-[280px]">
                        <input
                          type="text"
                          value={localPasteInput}
                          onChange={(e) => setLocalPasteInput(e.target.value)}
                          placeholder="Or paste friend's code…"
                          className="flex-1 bg-white/5 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none"
                        />
                        <button
                          type="button"
                          className="d2-invite-btn"
                          disabled={!localPasteInput.trim() || localBusy}
                          onClick={() => acceptLocalAnswer(localPasteInput)}
                        >
                          Go
                        </button>
                      </div>
                      {localConnectedIds.length >= 2 && (
                        <button
                          type="button"
                          className="d2-btn w-full max-w-[260px] mt-1"
                          onClick={startLocalHostMatch}
                        >
                          Start Match ({localConnectedIds.length} Players)
                        </button>
                      )}
                    </>
                  )}

                  {localScanning && (
                    <LocalQrScanner
                      onScan={(code) => {
                        setLocalScanning(false);
                        acceptLocalAnswer(code);
                      }}
                      onCancel={() => setLocalScanning(false)}
                    />
                  )}

                  <button
                    type="button"
                    className="d2-btn plain !text-xs !h-8"
                    onClick={closeLocalPeers}
                  >
                    Cancel
                  </button>
                </div>
              )}

              {localStep === 'join_scan' && (
                <div className="flex flex-col items-center gap-3 w-full py-2">
                  <p className="text-xs text-white/60">
                    Scan the Host&apos;s QR code (or paste their code):
                  </p>
                  {localScanning && (
                    <LocalQrScanner
                      onScan={(code) => {
                        setLocalScanning(false);
                        connectLocalAsGuest(code);
                      }}
                      onCancel={() => setLocalScanning(false)}
                    />
                  )}
                  {!localScanning && (
                    <button
                      type="button"
                      className="d2-invite-btn"
                      onClick={() => setLocalScanning(true)}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Open Camera</span>
                    </button>
                  )}
                  <div className="flex items-center gap-1.5 w-full max-w-[280px]">
                    <input
                      type="text"
                      value={localPasteInput}
                      onChange={(e) => setLocalPasteInput(e.target.value)}
                      placeholder="Paste host code…"
                      className="flex-1 bg-white/5 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none"
                    />
                    <button
                      type="button"
                      className="d2-invite-btn"
                      disabled={!localPasteInput.trim() || localBusy}
                      onClick={() => connectLocalAsGuest(localPasteInput)}
                    >
                      {localBusy ? '…' : 'Join'}
                    </button>
                  </div>
                  <button
                    type="button"
                    className="d2-btn plain !text-xs !h-8"
                    onClick={closeLocalPeers}
                  >
                    Back
                  </button>
                </div>
              )}

              {localStep === 'join_wait' && (
                <div className="flex flex-col items-center gap-3 w-full py-2">
                  <p className="text-xs text-white/60">
                    Let the Host tap <b>Scan Friend QR</b> and scan this:
                  </p>
                  {localQrDataUrl && (
                    <div className="p-2.5 rounded-2xl bg-white">
                      <img src={localQrDataUrl} alt="Answer QR" className="w-44 h-44 block" />
                    </div>
                  )}
                  <button type="button" className="d2-invite-btn" onClick={copyLocalCode}>
                    {localCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{localCopied ? 'Copied' : 'Copy answer code'}</span>
                  </button>
                  <button
                    type="button"
                    className="d2-btn plain !text-xs !h-8"
                    onClick={closeLocalPeers}
                  >
                    Cancel
                  </button>
                </div>
              )}

              {localStep === 'connected' && !isMultiActiveBoard && (
                <div className="flex flex-col items-center gap-3 py-8 text-white/70 text-sm">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Connected! Waiting for Host to start…</span>
                </div>
              )}
            </div>
          </div>
        )}

        {screen === 'game' && boardLayout && (
          <div id="d2-layer" ref={layerRef} style={{ transform: boardLayout.layerTransform }}>
            {boardLayout.items.map((item) => (
              <div
                key={item.chainIdx}
                data-chain-idx={item.chainIdx}
                data-ang={item.ang}
                className="d2-pos"
                style={{
                  left: `${item.x}px`,
                  top: `${item.y}px`,
                  transform: `translate(-50%,-50%) rotate(${item.ang}rad)`,
                }}
              >
                <DominoTile tile={item.h} horiz />
              </div>
            ))}
          </div>
        )}

        {showLoserGg && (
          <div className="d2-gg-overlay">
            <div className="d2-gg-stage">
              <div className="d2-gg-ring" />
              <div className="d2-gg-ring2" />
              <div className="d2-gg-spark" style={{ '--tx': '-74px', '--ty': '-54px' }} />
              <div className="d2-gg-spark" style={{ '--tx': '78px', '--ty': '-48px' }} />
              <div className="d2-gg-spark" style={{ '--tx': '-86px', '--ty': '38px' }} />
              <div className="d2-gg-spark" style={{ '--tx': '82px', '--ty': '44px' }} />
              <div className="d2-gg-spark" style={{ '--tx': '0px', '--ty': '-76px' }} />
              <div className="d2-gg-spark" style={{ '--tx': '0px', '--ty': '74px' }} />
              <span className="d2-gg-char d2-gg-char-l">g</span>
              <span className="d2-gg-char d2-gg-char-r">g</span>
            </div>
            <div className="d2-gg-sub">better luck next round</div>
          </div>
        )}
      </div>

      {/* Bottom (Game Only — no Restart button!) */}
      {screen === 'game' && (mode === 'bot' || isMultiActiveBoard) && (
        <div id="d2-bottom">
          <div id="d2-status" key={mode === 'bot' ? botStatusText : friendStatusText} className="d2-fade">
            {mode === 'bot' ? botStatusText : friendStatusText}
          </div>

          <div className="d2-row d2-mine" id="d2-hand">
            {activeHand.map((t, i) => {
              let animClass = '';
              let animDelay = '';
              if (mode === 'bot') {
                if (S.deal) {
                  animClass = 'd2-enter';
                  animDelay = `${250 + i * 60}ms`;
                } else if (i === S.newPIdx) {
                  animClass = 'd2-rise';
                }
              }
              return (
                <DominoTile
                  key={`${t[0]}-${t[1]}-${i}`}
                  tile={t}
                  animClass={animClass}
                  animDelay={animDelay}
                  onClick={(ev) => (mode === 'bot' ? clickBotTile(i, ev) : clickOnlineTile(i, ev))}
                />
              );
            })}
          </div>

          <div className="d2-bar" id="d2-bar">
            {mode === 'bot' ? (
              <>
                {S.over ? (
                  <button
                    type="button"
                    className="d2-btn"
                    onClick={S.match ? startNewGame : startNextRound}
                  >
                    {S.match ? 'New Match' : 'Next Round'}
                  </button>
                ) : S.turn === 'p' ? (
                  pending !== null && botEnds ? (
                    <>
                      <button
                        type="button"
                        className="d2-btn"
                        onClick={() => playerPlay(pending, 'l')}
                      >
                        Left · {botEnds[0]}
                      </button>
                      <button
                        type="button"
                        className="d2-btn"
                        onClick={() => playerPlay(pending, 'r')}
                      >
                        Right · {botEnds[1]}
                      </button>
                    </>
                  ) : botEnds && !S.p.some((t) => canPlayOriginal(t, S.chain, S.anyStart, S.startD)) ? (
                    S.pile.length ? (
                      <button type="button" className="d2-btn" onClick={botDraw}>
                        Draw
                      </button>
                    ) : (
                      <button type="button" className="d2-btn" onClick={botPass}>
                        Pass
                      </button>
                    )
                  ) : null
                ) : null}
              </>
            ) : (
              <>
                {onlineState?.status === 'ended' ? (
                  <button
                    type="button"
                    className="d2-btn"
                    onClick={() => handleOnlineAction({ action: 'rematch' })}
                  >
                    Play Again
                  </button>
                ) : onlineState?.isMyTurn ? (
                  onlinePending !== null && onlineEnds ? (
                    <>
                      <button
                        type="button"
                        className="d2-btn"
                        onClick={() => {
                          const idx = onlinePending;
                          setOnlinePending(null);
                          handleOnlineAction({ action: 'play', tileIndex: idx, side: 'left' });
                        }}
                      >
                        Left · {onlineEnds[0]}
                      </button>
                      <button
                        type="button"
                        className="d2-btn"
                        onClick={() => {
                          const idx = onlinePending;
                          setOnlinePending(null);
                          handleOnlineAction({ action: 'play', tileIndex: idx, side: 'right' });
                        }}
                      >
                        Right · {onlineEnds[1]}
                      </button>
                    </>
                  ) : onlineState.canDraw ? (
                    <button
                      type="button"
                      className="d2-btn"
                      onClick={() => handleOnlineAction({ action: 'draw' })}
                    >
                      Draw
                    </button>
                  ) : onlineState.canPass ? (
                    <button
                      type="button"
                      className="d2-btn"
                      onClick={() => handleOnlineAction({ action: 'pass' })}
                    >
                      Pass
                    </button>
                  ) : null
                ) : null}
              </>
            )}
          </div>
        </div>
      )}

      {/* X Button Action Sheet inside Active Game */}
      {exitPromptOpen && (
        <div
          className="fixed inset-0 z-[20050] bg-black/75 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setExitPromptOpen(false)}
        >
          <div
            className="w-full max-w-xs rounded-3xl bg-[#111] border border-white/15 p-5 flex flex-col gap-2.5 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm font-semibold text-white mb-1">Leave match?</div>
            {(mode === 'bot' || onlineState?.isHost) && (
              <button
                type="button"
                className="d2-btn !h-10 !text-sm"
                onClick={handleRestartFromPrompt}
              >
                Restart Match
              </button>
            )}
            {!isInvitedSession && (
              <button
                type="button"
                className="d2-btn plain !h-10 !text-sm border border-white/15"
                onClick={handleBackToMenu}
              >
                Back to Menu
              </button>
            )}
            <button
              type="button"
              className="d2-btn plain !h-10 !text-sm !text-red-400"
              onClick={() => {
                setExitPromptOpen(false);
                onClose();
              }}
            >
              Exit Game
            </button>
            <button
              type="button"
              className="d2-btn plain !h-9 !text-xs"
              onClick={() => setExitPromptOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
