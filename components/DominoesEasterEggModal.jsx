'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, WifiOff, Send, Loader2, Smile } from 'lucide-react';
import { apiFetch, getApiBaseUrl } from '@/lib/api';
import AvatarIcon from '@/components/AvatarIcon';

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

// Exact snake geometry from Dominoes_2.html
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
      const nextItem = tiles[idx + 1];
      const t = item.t;
      const dbl = t[0] === t[1];
      const nextDbl = nextItem ? nextItem.t[0] === nextItem.t[1] : false;
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
      } else if (Math.abs(p.x + d.x * len) > Hx && !prevDbl && !dbl && !nextDbl) {
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
  const [mode, setMode] = useState(initialRoomId ? 'friend' : 'bot');

  // Offline Bot state (exact Dominoes_2.html state)
  const [score, setScore] = useState({ p: 0, c: 0 });
  const [lastWinner, setLastWinner] = useState(null);
  const [S, setS] = useState(() => createBotRoundState(null));
  const [pending, setPending] = useState(null);
  const [confirmRestart, setConfirmRestart] = useState(false);

  // Online friend state
  const [onlineRoomId, setOnlineRoomId] = useState(initialRoomId || null);
  const [onlineState, setOnlineState] = useState(null);
  const [onlineError, setOnlineError] = useState('');
  const [invitingUsername, setInvitingUsername] = useState('');
  const [joiningRoom, setJoiningRoom] = useState(false);
  const [onlinePending, setOnlinePending] = useState(null);
  const [reactionMenuOpen, setReactionMenuOpen] = useState(false);
  const [floatingReaction, setFloatingReaction] = useState(null);
  const lastReactionIdRef = useRef(null);
  const sseConnectedRef = useRef(false);

  // Board container size for exact snake layout
  const boardRef = useRef(null);
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
    if (!open) return;
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
  }, [open, mode, onlineState?.status]);

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

  // Reset on open/close
  useEffect(() => {
    if (!open) {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
      leaveActiveRoom();
      setOnlineRoomId(null);
      setOnlineState(null);
      setOnlineError('');
      setPending(null);
      setOnlinePending(null);
      setConfirmRestart(false);
      return;
    }

    if (initialRoomId) {
      setMode('friend');
      setOnlineRoomId(initialRoomId);
      setOnlineError('');
      setPending(null);
      setOnlinePending(null);
    } else {
      setMode('bot');
      setScore({ p: 0, c: 0 });
      setLastWinner(null);
      setS(createBotRoundState(null));
      setPending(null);
      setOnlinePending(null);
      setConfirmRestart(false);
      setOnlineRoomId(null);
      setOnlineState(null);
      setOnlineError('');
    }
  }, [open, initialRoomId, leaveActiveRoom]);

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
        if (data?.state) setOnlineState(data.state);
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
            if (parsed?.state) setOnlineState(parsed.state);
          } catch (_) {}
        };
      } catch (_) {}
    };

    connect();

    // Fast 1s fallback poll whenever SSE is not open; 5s safety check when SSE is open
    let tick = 0;
    const poll = setInterval(async () => {
      if (cancelled) return;
      tick += 1;
      if (sseConnectedRef.current && tick % 5 !== 0) return;
      try {
        const res = await apiFetch(`/api/domino?roomId=${encodeURIComponent(onlineRoomId)}`);
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (!cancelled && data?.state) setOnlineState(data.state);
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

  // Show incoming/outgoing reactions briefly without clutter
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

  // Clear one-shot deal/rise flags after first render
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

  // Bot turn runner (snappy timings)
  useEffect(() => {
    if (!open || mode !== 'bot') return;
    if (S.over || S.turn !== 'c') return;

    const delay = S.chain.length === 0 ? 650 : S.cDrew ? 420 : 500;
    botTimerRef.current = setTimeout(() => {
      setS((prev) => {
        if (prev.over || prev.turn !== 'c') return prev;
        const e = endsOf(prev.chain);
        const ok = prev.c
          .map((t, i) => ({ t, i }))
          .filter((o) => canPlayOriginal(o.t, prev.chain, prev.anyStart, prev.startD))
          .sort((a, b) => b.t[0] + b.t[1] - (a.t[0] + a.t[1]));

        if (ok.length) {
          const { t, i } = ok[0];
          let side = 'r';
          if (e && !t.includes(e[1])) side = 'l';
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

          // Check finish
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
  }, [open, mode, S.over, S.turn, S.c.length, S.pile.length, S.chain.length, S.cDrew]);

  const startNewGame = useCallback(() => {
    if (botTimerRef.current) clearTimeout(botTimerRef.current);
    setScore({ p: 0, c: 0 });
    setLastWinner(null);
    setPending(null);
    setConfirmRestart(false);
    setS(createBotRoundState(null));
  }, []);

  const startNextRound = useCallback(() => {
    if (botTimerRef.current) clearTimeout(botTimerRef.current);
    setPending(null);
    setConfirmRestart(false);
    setS(createBotRoundState(lastWinnerRef.current));
  }, []);

  const playerPlay = useCallback((i, side) => {
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

  const clickBotTile = (i) => {
    if (S.over || S.turn !== 'p') return;
    const t = S.p[i];
    if (!canPlayOriginal(t, S.chain, S.anyStart, S.startD)) return;
    const e = endsOf(S.chain);
    if (!e) {
      playerPlay(i, 'r');
      return;
    }
    const L = t.includes(e[0]);
    const R = t.includes(e[1]);
    if (L && R && e[0] !== e[1]) {
      setPending(i);
      return;
    }
    playerPlay(i, R ? 'r' : 'l');
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

  // Online friend handlers
  const switchMode = async (nextMode) => {
    if (nextMode === mode || isInvitedSession) return;
    if (onlineRoomId) {
      await leaveActiveRoom(onlineRoomId);
      setOnlineRoomId(null);
      setOnlineState(null);
    }
    setPending(null);
    setOnlinePending(null);
    setOnlineError('');
    setConfirmRestart(false);
    setMode(nextMode);
    if (nextMode === 'bot') {
      startNewGame();
    }
  };

  const handleInviteFriend = async (username) => {
    if (!username || invitingUsername) return;
    setInvitingUsername(username);
    setOnlineError('');
    try {
      const res = await apiFetch('/api/domino', {
        method: 'POST',
        body: JSON.stringify({ action: 'create', targetUsername: username }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setOnlineError(
          data?.error === 'too_many_requests'
            ? 'Please wait a moment before inviting again.'
            : 'Could not send invite.'
        );
        return;
      }
      setOnlineRoomId(data.roomId);
      setOnlineState(data.state);
    } catch (_) {
      setOnlineError('Failed to send invite. Check your connection.');
    } finally {
      setInvitingUsername('');
    }
  };

  const handleOnlineAction = async (payload) => {
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

  const clickOnlineTile = (i) => {
    if (!onlineState?.isMyTurn) return;
    const t = onlineState.myHand[i];
    if (!canPlayOnline(t, onlineState.board)) return;
    const e = endsOf(onlineState.board);
    if (!e) {
      setOnlinePending(null);
      // Optimistic local update for 0ms response
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
      setOnlinePending(i);
      return;
    }
    const chosenSide = R ? 'right' : 'left';
    setOnlinePending(null);
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

  const isFriendActiveBoard =
    mode === 'friend' &&
    onlineState &&
    (onlineState.status === 'playing' || onlineState.status === 'ended');

  const activeChain = mode === 'bot' ? S.chain : onlineState?.board || [];
  const activeStartIdx = mode === 'bot' ? S.startIdx : onlineState?.startIdx || 0;
  const activeHand = mode === 'bot' ? S.p : onlineState?.myHand || [];
  const activeOppCount = mode === 'bot' ? S.c.length : onlineState?.opponentCount || 0;
  const activePileCount = mode === 'bot' ? S.pile.length : onlineState?.pileCount || 0;

  const boardLayout = useMemo(
    () => computeLayout(activeChain, activeStartIdx, boardSize.w, boardSize.h),
    [activeChain, activeStartIdx, boardSize.w, boardSize.h]
  );

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
        return onlineState.endReason === 'blocked'
          ? `Blocked — ${onlineState.opponentName} wins`
          : `${onlineState.opponentName} wins`;
      }
      return 'Blocked — it\u2019s a draw';
    }
    if (onlinePending !== null) return 'Choose which end to play';
    if (onlineState.isMyTurn && onlineState.board.length > 0) {
      if (onlineState.canDraw) return 'No matching tile — draw from the pile';
      if (onlineState.canPass) return 'Nothing left to draw — pass';
    }
    return onlineState.isMyTurn ? 'Your turn' : `${onlineState.opponentName}\u2019s turn`;
  }, [onlineState, onlinePending]);

  if (!open) return null;

  const botEnds = endsOf(S.chain);
  const onlineEnds = endsOf(onlineState?.board || []);
  const showLoserGg =
    (mode === 'bot' && S.over && lastWinner === 'c') ||
    (mode === 'friend' &&
      onlineState?.status === 'ended' &&
      Boolean(onlineState?.winnerUserId) &&
      onlineState.winnerUserId !== onlineState.myId);

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
          padding-top: calc(env(safe-area-inset-top, 0px) + 22px);
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
        .d2-root * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        #d2-top {
          padding: 36px 16px 0;
          text-align: center;
          position: relative;
        }
        .d2-mode-switch {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          padding: 3px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          margin-bottom: 10px;
        }
        .d2-mode-btn {
          border: none;
          background: transparent;
          color: rgba(255, 255, 255, 0.52);
          font-size: 11px;
          font-weight: 500;
          height: auto;
          padding: 5px 12px;
          border-radius: 999px;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .d2-mode-btn.active {
          background: rgba(255, 255, 255, 0.14);
          color: #fff;
        }
        .d2-close-btn {
          position: absolute;
          top: 32px;
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
        }
        .d2-react-btn {
          position: absolute;
          top: 32px;
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
        }
        .d2-react-tray {
          position: absolute;
          top: 74px;
          left: 16px;
          z-index: 20;
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
          top: 34px;
          left: 60px;
          z-index: 15;
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
        #d2-bottom { padding: 0 16px 8px; text-align: center; }
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
        .d2-btn.plain { background: transparent; color: var(--fg); font-weight: 500; opacity: .55; }
        .d2-enter { animation: d2enter .5s cubic-bezier(.2,.9,.3,1.15) both; }
        .d2-drop { animation: d2drop .45s cubic-bezier(.2,.9,.3,1.1) both; }
        .d2-rise { animation: d2enter .35s cubic-bezier(.2,.9,.3,1.1) both; }
        @keyframes d2enter { from { opacity: 0; transform: translateY(18px) scale(.9); } to { opacity: 1; transform: none; } }
        @keyframes d2drop { from { opacity: 0; transform: scale(1.4); } 55% { opacity: 1; } to { opacity: 1; transform: scale(1); } }
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
          line-height: 0.9;
          color: #ffffff;
          letter-spacing: -0.06em;
          text-shadow: 0 8px 32px rgba(255, 255, 255, 0.22);
          display: inline-block;
        }
        .d2-gg-char-l { animation: d2ggCharL 3.1s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .d2-gg-char-r { animation: d2ggCharR 3.1s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .d2-gg-sub {
          margin-top: 10px;
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
        .d2-friend-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 11px 14px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
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
        {!isInvitedSession && (
          <div className="d2-mode-switch" role="tablist" aria-label="Game mode">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'bot'}
              className={`d2-mode-btn ${mode === 'bot' ? 'active' : ''}`}
              onClick={() => switchMode('bot')}
            >
              vs Bot
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'friend'}
              className={`d2-mode-btn ${mode === 'friend' ? 'active' : ''}`}
              onClick={() => switchMode('friend')}
            >
              vs Friend
            </button>
          </div>
        )}

        <button
          type="button"
          className="d2-close-btn"
          onClick={onClose}
          aria-label="Close Dominoes"
        >
          <X className="w-4 h-4" />
        </button>

        {isFriendActiveBoard && (
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

        {(mode === 'bot' || isFriendActiveBoard) && (
          <>
            <div
              className="d2-row"
              id="d2-comp"
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
            <div id="d2-info">
              {mode === 'bot'
                ? `You ${score.p}  ·  Opponent ${score.c}  ·  Pile ${activePileCount}`
                : `You ${onlineState.myScore}  ·  ${onlineState.opponentName} ${onlineState.opponentScore}  ·  Pile ${activePileCount}`}
            </div>
          </>
        )}
      </div>

      {/* Board / Online Lobby */}
      <div id="d2-board" ref={boardRef}>
        {mode === 'friend' && !isFriendActiveBoard ? (
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
                <div className="flex flex-col items-center gap-4 py-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-white/70" />
                  <div>
                    <p className="text-sm font-medium text-white">
                      Invite sent to {onlineState.opponentName}
                    </p>
                    <p className="text-xs text-white/45 mt-1">Waiting for them to accept…</p>
                  </div>
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
                  <p className="text-sm text-white/75">{onlineState.opponentName} left the match.</p>
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
              ) : !isSignedIn ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center text-white/55 text-sm">
                  <WifiOff className="w-5 h-5 mb-1" />
                  <span>Sign in to invite friends in bokra.</span>
                </div>
              ) : friends.length === 0 ? (
                <div className="text-center py-8 text-white/50 text-sm">
                  Add friends in bokra first to invite them here.
                </div>
              ) : (
                <>
                  <p className="text-xs text-white/45 text-center mb-1">
                    Invite a friend to play
                  </p>
                  {friends.map((f) => {
                    const u = f?.user || {};
                    const username = u.username;
                    if (!username) return null;
                    const isInviting = invitingUsername === username;
                    return (
                      <div key={f.friendshipId || username} className="d2-friend-row">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-white/10 border border-white/15 flex items-center justify-center overflow-hidden shrink-0">
                            <AvatarIcon
                              name={u.avatar || 'user'}
                              size={u.avatar && (u.avatar.startsWith('data:') || u.avatar.startsWith('http')) ? undefined : 18}
                              className="w-full h-full object-cover text-white/80"
                            />
                          </div>
                          <div className="min-w-0 text-left">
                            <div className="text-sm font-medium text-white truncate">
                              {u.name || username}
                            </div>
                            <div className="text-[11px] text-white/40 truncate">@{username}</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="d2-invite-btn"
                          disabled={Boolean(invitingUsername)}
                          onClick={() => handleInviteFriend(username)}
                        >
                          {isInviting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          <span>{isInviting ? 'Sending…' : 'Invite'}</span>
                        </button>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        ) : (
          boardLayout && (
            <div id="d2-layer" style={{ transform: boardLayout.layerTransform }}>
              {boardLayout.items.map((item) => (
                <div
                  key={item.chainIdx}
                  className="d2-pos"
                  style={{
                    left: `${item.x}px`,
                    top: `${item.y}px`,
                    transform: `translate(-50%,-50%) rotate(${item.ang}rad)`,
                  }}
                >
                  <DominoTile
                    tile={item.h}
                    horiz
                    animClass={mode === 'bot' && item.chainIdx === S.newestIdx ? 'd2-drop' : ''}
                  />
                </div>
              ))}
            </div>
          )
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

      {/* Bottom */}
      {(mode === 'bot' || isFriendActiveBoard) && (
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
                  onClick={() => (mode === 'bot' ? clickBotTile(i) : clickOnlineTile(i))}
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

                {!S.over &&
                  (confirmRestart ? (
                    <div className="flex items-center gap-2 text-xs text-white/60">
                      <span>Restart?</span>
                      <button
                        type="button"
                        className="d2-btn !h-8 !px-4 !text-xs"
                        onClick={startNewGame}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        className="d2-btn plain !h-8 !px-3 !text-xs"
                        onClick={() => setConfirmRestart(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="d2-btn plain"
                      onClick={() => setConfirmRestart(true)}
                    >
                      Restart
                    </button>
                  ))}
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
    </div>
  );
}
