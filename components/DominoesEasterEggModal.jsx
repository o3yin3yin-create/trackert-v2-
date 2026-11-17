'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, WifiOff, Send, Loader2 } from 'lucide-react';
import { apiFetch, getApiBaseUrl } from '@/lib/api';

const PIPS_LAYOUT = {
  0: [],
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function PipHalf({ num, mini = false }) {
  const active = PIPS_LAYOUT[num] || [];
  return (
    <div className={mini ? 'domino-half domino-half-mini' : 'domino-half'}>
      {Array.from({ length: 9 }).map((_, idx) => (
        <span
          key={idx}
          className={
            active.includes(idx)
              ? mini
                ? 'domino-pip domino-pip-mini domino-pip-on'
                : 'domino-pip domino-pip-on'
              : mini
                ? 'domino-pip domino-pip-mini'
                : 'domino-pip'
          }
        />
      ))}
    </div>
  );
}

function DominoTile({
  a,
  b,
  horizontal = false,
  mini = false,
  back = false,
  clickable = false,
  selected = false,
  dimmed = false,
  onClick,
}) {
  const classes = [
    'domino-tile',
    horizontal ? 'domino-tile-horiz' : 'domino-tile-vert',
    mini ? 'domino-tile-mini' : '',
    back ? 'domino-tile-back' : '',
    clickable ? 'domino-tile-clickable' : '',
    selected ? 'domino-tile-selected' : '',
    dimmed ? 'domino-tile-dimmed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classes}
      onClick={clickable ? onClick : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      {back ? (
        <div className="domino-back-divider" />
      ) : (
        <>
          <PipHalf num={a} mini={mini} />
          <div className={horizontal ? 'domino-divider-horiz' : 'domino-divider-vert'} />
          <PipHalf num={b} mini={mini} />
        </>
      )}
    </div>
  );
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

function createBotRound() {
  const deck = createShuffledDeck();
  const p1Hand = deck.slice(0, 7);
  const p2Hand = deck.slice(7, 14);
  const pile = deck.slice(14);
  return {
    board: [],
    leftVal: null,
    rightVal: null,
    p1Hand,
    p2Hand,
    pile,
    turn: 'p1',
    consecutivePasses: 0,
    status: 'playing',
  };
}

function canPlayTile(tile, board, leftVal, rightVal) {
  if (board.length === 0) return { left: true, right: true };
  return {
    left: tile[0] === leftVal || tile[1] === leftVal,
    right: tile[0] === rightVal || tile[1] === rightVal,
  };
}

function hasValidMove(hand, board, leftVal, rightVal) {
  return hand.some((t) => {
    const c = canPlayTile(t, board, leftVal, rightVal);
    return c.left || c.right;
  });
}

function handSum(hand) {
  return hand.reduce((acc, [a, b]) => acc + a + b, 0);
}

function computeSnakedBoard(board) {
  if (!board.length) return [];
  const items = board.map((tile, idx) => ({ tile, idx, flipped: false }));
  return items.map((item, pos) => {
    const [a, b] = item.tile;
    const isDouble = a === b;
    const row = Math.floor(pos / 6);
    const reverse = row % 2 === 1;
    return {
      ...item,
      row,
      reverse,
      isDouble,
      displayA: reverse && !isDouble ? b : a,
      displayB: reverse && !isDouble ? a : b,
    };
  });
}

export default function DominoesEasterEggModal({
  open,
  onClose,
  friends = [],
  isSignedIn = false,
  initialRoomId = null,
}) {
  const isInvitedSession = Boolean(initialRoomId);
  const [mode, setMode] = useState(initialRoomId ? 'friend' : 'bot'); // 'bot' | 'friend'
  const [botScores, setBotScores] = useState({ p1: 0, p2: 0 });
  const [botGame, setBotGame] = useState(() => createBotRound());
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [botBanner, setBotBanner] = useState('Your turn');

  // Online friend state
  const [onlineRoomId, setOnlineRoomId] = useState(initialRoomId || null);
  const [onlineState, setOnlineState] = useState(null);
  const [onlineError, setOnlineError] = useState('');
  const [invitingUsername, setInvitingUsername] = useState('');
  const [joiningRoom, setJoiningRoom] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);

  const botTimerRef = useRef(null);
  const sseRef = useRef(null);
  const activeRoomRef = useRef(null);

  useEffect(() => {
    activeRoomRef.current = onlineRoomId;
  }, [onlineRoomId]);

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

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!open) {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
      leaveActiveRoom();
      setOnlineRoomId(null);
      setOnlineState(null);
      setOnlineError('');
      setSelectedIdx(null);
      setConfirmRestart(false);
      return;
    }

    if (initialRoomId) {
      setMode('friend');
      setOnlineRoomId(initialRoomId);
      setOnlineError('');
      setSelectedIdx(null);
    } else {
      setMode('bot');
      setBotScores({ p1: 0, p2: 0 });
      setBotGame(createBotRound());
      setSelectedIdx(null);
      setBotBanner('Your turn');
      setOnlineRoomId(null);
      setOnlineState(null);
      setOnlineError('');
    }
  }, [open, initialRoomId, leaveActiveRoom]);

  // Connect SSE + join if initialRoomId
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
          setOnlineError(data?.error === 'room_not_found' ? 'This match expired or was closed.' : 'Could not join match.');
          setJoiningRoom(false);
          return;
        }
        if (data?.state) {
          setOnlineState(data.state);
        }
      } catch (_) {
        if (!cancelled) setOnlineError('Connection lost. Check your internet.');
      } finally {
        if (!cancelled) setJoiningRoom(false);
      }

      if (cancelled) return;
      const base = getApiBaseUrl();
      const streamUrl = `${base}/api/domino/stream?roomId=${encodeURIComponent(onlineRoomId)}`;
      try {
        const es = new EventSource(streamUrl, { withCredentials: true });
        sseRef.current = es;
        es.onmessage = (ev) => {
          try {
            const parsed = JSON.parse(ev.data);
            if (parsed?.state) {
              setOnlineState(parsed.state);
            }
          } catch (_) {}
        };
      } catch (_) {}
    };

    connect();

    // Lightweight fallback poll every 4s in case SSE drops on mobile wake
    const poll = setInterval(async () => {
      if (cancelled) return;
      try {
        const res = await apiFetch(`/api/domino?roomId=${encodeURIComponent(onlineRoomId)}`);
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (!cancelled && data?.state) setOnlineState(data.state);
        }
      } catch (_) {}
    }, 4000);

    return () => {
      cancelled = true;
      clearInterval(poll);
      closeSse();
    };
  }, [open, mode, onlineRoomId, closeSse]);

  // --- OFFLINE BOT LOGIC ---
  const restartBotRound = useCallback((resetScores = false) => {
    if (botTimerRef.current) clearTimeout(botTimerRef.current);
    if (resetScores) setBotScores({ p1: 0, p2: 0 });
    setBotGame(createBotRound());
    setSelectedIdx(null);
    setBotBanner('Your turn');
  }, []);

  const switchMode = async (nextMode) => {
    if (nextMode === mode || isInvitedSession) return;
    if (onlineRoomId) {
      await leaveActiveRoom(onlineRoomId);
      setOnlineRoomId(null);
      setOnlineState(null);
    }
    setSelectedIdx(null);
    setOnlineError('');
    setMode(nextMode);
    if (nextMode === 'bot') {
      restartBotRound(true);
    }
  };

  const applyBotMove = useCallback((prev, who, tileIdx, side) => {
    const handKey = who === 'p1' ? 'p1Hand' : 'p2Hand';
    const hand = [...prev[handKey]];
    const [a, b] = hand.splice(tileIdx, 1)[0];
    const nextBoard = [...prev.board];
    let nextLeft = prev.leftVal;
    let nextRight = prev.rightVal;

    if (nextBoard.length === 0) {
      nextBoard.push([a, b]);
      nextLeft = a;
      nextRight = b;
    } else if (side === 'left') {
      const oriented = b === prev.leftVal ? [a, b] : [b, a];
      nextBoard.unshift(oriented);
      nextLeft = oriented[0];
    } else {
      const oriented = a === prev.rightVal ? [a, b] : [b, a];
      nextBoard.push(oriented);
      nextRight = oriented[1];
    }

    const nextState = {
      ...prev,
      board: nextBoard,
      leftVal: nextLeft,
      rightVal: nextRight,
      [handKey]: hand,
      consecutivePasses: 0,
      turn: who === 'p1' ? 'p2' : 'p1',
    };

    if (hand.length === 0) {
      nextState.status = 'ended';
      setBotScores((s) => ({ ...s, [who]: s[who] + 1 }));
      setBotBanner(who === 'p1' ? 'You win' : 'Opponent wins');
    } else {
      setBotBanner(who === 'p1' ? 'Opponent thinking…' : 'Your turn');
    }

    return nextState;
  }, []);

  // Bot turn runner
  useEffect(() => {
    if (!open || mode !== 'bot') return;
    if (botGame.status !== 'playing' || botGame.turn !== 'p2') return;

    botTimerRef.current = setTimeout(() => {
      setBotGame((prev) => {
        if (prev.status !== 'playing' || prev.turn !== 'p2') return prev;
        let currentHand = [...prev.p2Hand];
        const currentPile = [...prev.pile];

        const findBestMove = (hand) => {
          const moves = [];
          hand.forEach((tile, idx) => {
            const c = canPlayTile(tile, prev.board, prev.leftVal, prev.rightVal);
            if (c.left) moves.push({ idx, side: 'left', weight: tile[0] + tile[1] });
            if (c.right && prev.board.length > 0) moves.push({ idx, side: 'right', weight: tile[0] + tile[1] });
          });
          moves.sort((x, y) => y.weight - x.weight);
          return moves[0] || null;
        };

        let move = findBestMove(currentHand);
        while (!move && currentPile.length > 0) {
          currentHand.push(currentPile.pop());
          move = findBestMove(currentHand);
        }

        const updated = { ...prev, p2Hand: currentHand, pile: currentPile };
        if (move) {
          return applyBotMove(updated, 'p2', move.idx, move.side);
        }

        const nextPasses = prev.consecutivePasses + 1;
        if (nextPasses >= 2) {
          const s1 = handSum(updated.p1Hand);
          const s2 = handSum(updated.p2Hand);
          if (s1 < s2) {
            setBotScores((s) => ({ ...s, p1: s.p1 + 1 }));
            setBotBanner('Blocked · You win');
          } else if (s2 < s1) {
            setBotScores((s) => ({ ...s, p2: s.p2 + 1 }));
            setBotBanner('Blocked · Opponent wins');
          } else {
            setBotBanner('Blocked · Draw');
          }
          return { ...updated, consecutivePasses: nextPasses, status: 'ended' };
        }

        setBotBanner('Opponent passed · Your turn');
        return { ...updated, consecutivePasses: nextPasses, turn: 'p1' };
      });
    }, 520);

    return () => {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
    };
  }, [open, mode, botGame.status, botGame.turn, applyBotMove]);

  const handleBotTileClick = (idx) => {
    if (botGame.status !== 'playing' || botGame.turn !== 'p1') return;
    const tile = botGame.p1Hand[idx];
    const fit = canPlayTile(tile, botGame.board, botGame.leftVal, botGame.rightVal);
    if (!fit.left && !fit.right) return;

    if (botGame.board.length === 0) {
      setSelectedIdx(null);
      setBotGame((prev) => applyBotMove(prev, 'p1', idx, 'left'));
      return;
    }

    if (fit.left && !fit.right) {
      setSelectedIdx(null);
      setBotGame((prev) => applyBotMove(prev, 'p1', idx, 'left'));
      return;
    }

    if (fit.right && !fit.left) {
      setSelectedIdx(null);
      setBotGame((prev) => applyBotMove(prev, 'p1', idx, 'right'));
      return;
    }

    setSelectedIdx((cur) => (cur === idx ? null : idx));
  };

  const handleBotSidePick = (side) => {
    if (selectedIdx === null || botGame.status !== 'playing' || botGame.turn !== 'p1') return;
    const idx = selectedIdx;
    setSelectedIdx(null);
    setBotGame((prev) => applyBotMove(prev, 'p1', idx, side));
  };

  const handleBotDrawOrPass = () => {
    if (botGame.status !== 'playing' || botGame.turn !== 'p1') return;
    setSelectedIdx(null);
    setBotGame((prev) => {
      if (prev.pile.length > 0) {
        const nextPile = [...prev.pile];
        const drawn = nextPile.pop();
        return { ...prev, pile: nextPile, p1Hand: [...prev.p1Hand, drawn] };
      }
      const nextPasses = prev.consecutivePasses + 1;
      if (nextPasses >= 2) {
        const s1 = handSum(prev.p1Hand);
        const s2 = handSum(prev.p2Hand);
        if (s1 < s2) {
          setBotScores((s) => ({ ...s, p1: s.p1 + 1 }));
          setBotBanner('Blocked · You win');
        } else if (s2 < s1) {
          setBotScores((s) => ({ ...s, p2: s.p2 + 1 }));
          setBotBanner('Blocked · Opponent wins');
        } else {
          setBotBanner('Blocked · Draw');
        }
        return { ...prev, consecutivePasses: nextPasses, status: 'ended' };
      }
      setBotBanner('Passed · Opponent thinking…');
      return { ...prev, consecutivePasses: nextPasses, turn: 'p2' };
    });
  };

  // --- ONLINE FRIEND LOGIC ---
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
        setOnlineError(data?.error === 'too_many_requests' ? 'Please wait a moment before inviting again.' : 'Could not send invite.');
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
      if (res.ok && data?.state) {
        setOnlineState(data.state);
      }
    } catch (_) {}
  };

  const handleOnlineTileClick = (idx) => {
    if (!onlineState?.isMyTurn) return;
    const tile = onlineState.myHand[idx];
    const fit = canPlayTile(tile, onlineState.board, onlineState.leftVal, onlineState.rightVal);
    if (!fit.left && !fit.right) return;

    if (onlineState.board.length === 0 || (fit.left && !fit.right)) {
      setSelectedIdx(null);
      handleOnlineAction({ action: 'play', tileIndex: idx, side: 'left' });
      return;
    }
    if (fit.right && !fit.left) {
      setSelectedIdx(null);
      handleOnlineAction({ action: 'play', tileIndex: idx, side: 'right' });
      return;
    }
    setSelectedIdx((cur) => (cur === idx ? null : idx));
  };

  const handleOnlineSidePick = (side) => {
    if (selectedIdx === null || !onlineState?.isMyTurn) return;
    const idx = selectedIdx;
    setSelectedIdx(null);
    handleOnlineAction({ action: 'play', tileIndex: idx, side });
  };

  // --- UNIFIED RENDER PROPS ---
  const isFriendActiveBoard = mode === 'friend' && onlineState && (onlineState.status === 'playing' || onlineState.status === 'ended');

  const activeBoard = mode === 'bot' ? botGame.board : (onlineState?.board || []);
  const activeLeftVal = mode === 'bot' ? botGame.leftVal : onlineState?.leftVal;
  const activeRightVal = mode === 'bot' ? botGame.rightVal : onlineState?.rightVal;
  const activeHand = mode === 'bot' ? botGame.p1Hand : (onlineState?.myHand || []);
  const activeOppCount = mode === 'bot' ? botGame.p2Hand.length : (onlineState?.opponentCount || 0);
  const activePileCount = mode === 'bot' ? botGame.pile.length : (onlineState?.pileCount || 0);
  const isMyTurnNow = mode === 'bot' ? (botGame.status === 'playing' && botGame.turn === 'p1') : Boolean(onlineState?.isMyTurn);
  const isGameEnded = mode === 'bot' ? botGame.status === 'ended' : onlineState?.status === 'ended';

  const botHasMove = useMemo(
    () => (mode === 'bot' ? hasValidMove(botGame.p1Hand, botGame.board, botGame.leftVal, botGame.rightVal) : false),
    [mode, botGame.p1Hand, botGame.board, botGame.leftVal, botGame.rightVal]
  );

  const showDrawOrPass = mode === 'bot'
    ? (isMyTurnNow && !botHasMove)
    : Boolean(onlineState?.isMyTurn && (onlineState?.canDraw || onlineState?.canPass));

  const snaked = useMemo(() => computeSnakedBoard(activeBoard), [activeBoard]);
  const rows = useMemo(() => {
    const grouped = [];
    for (const item of snaked) {
      if (!grouped[item.row]) grouped[item.row] = [];
      grouped[item.row].push(item);
    }
    return grouped;
  }, [snaked]);

  const friendBanner = useMemo(() => {
    if (!onlineState) return '';
    if (onlineState.status === 'ended') {
      if (onlineState.winnerUserId === onlineState.myId) {
        return onlineState.endReason === 'blocked' ? 'Blocked · You win' : 'You win';
      }
      if (onlineState.winnerUserId) {
        return onlineState.endReason === 'blocked'
          ? `Blocked · ${onlineState.opponentName} wins`
          : `${onlineState.opponentName} wins`;
      }
      return 'Blocked · Draw';
    }
    return onlineState.isMyTurn ? 'Your turn' : `${onlineState.opponentName}'s turn`;
  }, [onlineState]);

  if (!open) return null;

  return (
    <div className="domino-root" role="dialog" aria-modal="true" aria-label="Dominoes">
      <style>{`
        .domino-root {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: #050505;
          color: #ffffff;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          user-select: none;
          -webkit-user-select: none;
          padding-top: calc(env(safe-area-inset-top, 0px) + 22px);
          padding-bottom: env(safe-area-inset-bottom, 0px);
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", sans-serif;
        }
        #domino-top {
          padding: 36px 24px 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          position: relative;
        }
        .domino-mode-switch {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          padding: 3px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
          margin-bottom: 4px;
        }
        .domino-mode-btn {
          border: none;
          background: transparent;
          color: rgba(255, 255, 255, 0.52);
          font-size: 11px;
          font-weight: 500;
          padding: 5px 12px;
          border-radius: 999px;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .domino-mode-btn-active {
          background: rgba(255, 255, 255, 0.14);
          color: #ffffff;
        }
        .domino-close-btn {
          position: absolute;
          top: 32px;
          right: 20px;
          width: 36px;
          height: 36px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.72);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .domino-close-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #ffffff;
        }
        .domino-opp-hand {
          display: flex;
          justify-content: center;
          gap: 6px;
          flex-wrap: wrap;
          min-height: 52px;
          align-items: center;
        }
        .domino-meta {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
          letter-spacing: 0.02em;
        }
        #domino-center {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 16px;
          overflow: auto;
          gap: 10px;
        }
        .domino-board-rows {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .domino-board-row {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .domino-board-row-rev {
          flex-direction: row-reverse;
        }
        .domino-empty-board {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.35);
          letter-spacing: 0.02em;
        }
        .domino-side-picker {
          display: flex;
          gap: 10px;
          margin-top: 8px;
        }
        .domino-side-btn {
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.25);
          color: #ffffff;
          padding: 6px 14px;
          border-radius: 999px;
          font-size: 12px;
          cursor: pointer;
        }
        .domino-side-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        #domino-bottom {
          padding: 0 18px 28px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
        }
        .domino-status {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.72);
          min-height: 20px;
        }
        .domino-hand {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 8px;
          min-height: 90px;
          align-items: center;
        }
        .domino-actions {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 18px;
          min-height: 32px;
        }
        .domino-action-btn {
          background: none;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: rgba(255, 255, 255, 0.85);
          padding: 6px 16px;
          border-radius: 999px;
          font-size: 13px;
          cursor: pointer;
          transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
        }
        .domino-action-btn:hover {
          border-color: rgba(255, 255, 255, 0.45);
          background: rgba(255, 255, 255, 0.06);
        }
        .domino-restart-link {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.55);
          font-size: 15px;
          cursor: pointer;
          padding: 6px 10px;
          transition: color 0.15s ease;
        }
        .domino-restart-link:hover {
          color: #ffffff;
        }
        .domino-lobby {
          width: 100%;
          max-width: 360px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .domino-friend-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 11px 14px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .domino-invite-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 13px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.22);
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .domino-invite-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.18);
        }
        .domino-invite-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .domino-tile {
          background: #0a0a0a;
          border: 1.5px solid rgba(255, 255, 255, 0.85);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-sizing: border-box;
          transition: transform 0.14s ease, border-color 0.14s ease, opacity 0.14s ease;
        }
        .domino-tile-vert {
          width: 44px;
          height: 86px;
          flex-direction: column;
          padding: 4px;
        }
        .domino-tile-horiz {
          width: 68px;
          height: 36px;
          flex-direction: row;
          padding: 3px;
        }
        .domino-tile-mini.domino-tile-vert {
          width: 34px;
          height: 66px;
          padding: 3px;
          border-radius: 6px;
        }
        .domino-tile-mini.domino-tile-horiz {
          width: 58px;
          height: 30px;
          padding: 3px;
          border-radius: 6px;
        }
        .domino-tile-back {
          width: 28px !important;
          height: 50px !important;
          background: #ffffff;
          border-color: #ffffff;
          justify-content: center;
          padding: 4px;
        }
        .domino-back-divider {
          width: 100%;
          height: 1px;
          background: rgba(0, 0, 0, 0.25);
        }
        .domino-tile-clickable {
          cursor: pointer;
        }
        .domino-tile-clickable:hover {
          transform: translateY(-6px);
          border-color: #ffffff;
        }
        .domino-tile-selected {
          transform: translateY(-10px) !important;
          border-color: #ffffff;
          box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.35);
        }
        .domino-tile-dimmed {
          opacity: 0.35;
        }
        .domino-divider-vert {
          width: 85%;
          height: 1px;
          background: rgba(255, 255, 255, 0.35);
        }
        .domino-divider-horiz {
          height: 85%;
          width: 1px;
          background: rgba(255, 255, 255, 0.35);
        }
        .domino-half {
          width: 34px;
          height: 34px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          grid-template-rows: repeat(3, 1fr);
          place-items: center;
        }
        .domino-half-mini {
          width: 24px;
          height: 24px;
        }
        .domino-pip {
          width: 5px;
          height: 5px;
          border-radius: 999px;
          background: transparent;
        }
        .domino-pip-mini {
          width: 3.5px;
          height: 3.5px;
        }
        .domino-pip-on {
          background: #ffffff;
        }
      `}</style>

      {/* Top */}
      <div id="domino-top">
        {!isInvitedSession && (
          <div className="domino-mode-switch" role="tablist" aria-label="Game mode">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'bot'}
              className={`domino-mode-btn ${mode === 'bot' ? 'domino-mode-btn-active' : ''}`}
              onClick={() => switchMode('bot')}
            >
              vs Bot
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'friend'}
              className={`domino-mode-btn ${mode === 'friend' ? 'domino-mode-btn-active' : ''}`}
              onClick={() => switchMode('friend')}
            >
              vs Friend
            </button>
          </div>
        )}

        <button
          type="button"
          className="domino-close-btn"
          onClick={onClose}
          aria-label="Close Dominoes"
        >
          <X className="w-4 h-4" />
        </button>

        {(mode === 'bot' || isFriendActiveBoard) && (
          <>
            <div className="domino-opp-hand">
              {Array.from({ length: activeOppCount }).map((_, idx) => (
                <DominoTile key={idx} back />
              ))}
            </div>
            <div className="domino-meta">
              {mode === 'bot'
                ? `You ${botScores.p1} · Opponent ${botScores.p2} · Pile ${activePileCount}`
                : `You ${onlineState.myScore} · ${onlineState.opponentName} ${onlineState.opponentScore} · Pile ${activePileCount}`}
            </div>
          </>
        )}
      </div>

      {/* Center */}
      <div id="domino-center">
        {mode === 'friend' && !isFriendActiveBoard ? (
          <div className="domino-lobby">
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
                    className="domino-action-btn"
                    onClick={() => {
                      setOnlineError('');
                      setOnlineRoomId(null);
                      setOnlineState(null);
                    }}
                  >
                    Back to friends
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
                  <p className="text-xs text-white/45 mt-1">
                    Waiting for them to accept…
                  </p>
                </div>
                <button
                  type="button"
                  className="domino-action-btn"
                  onClick={async () => {
                    await leaveActiveRoom(onlineRoomId);
                    setOnlineRoomId(null);
                    setOnlineState(null);
                  }}
                >
                  Cancel invite
                </button>
              </div>
            ) : onlineState?.status === 'cancelled' ? (
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <p className="text-sm text-white/75">
                  {onlineState.opponentName} left the match.
                </p>
                {!isInvitedSession && (
                  <button
                    type="button"
                    className="domino-action-btn"
                    onClick={() => {
                      setOnlineRoomId(null);
                      setOnlineState(null);
                    }}
                  >
                    Invite someone else
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
                  Invite a friend to play — they&apos;ll get an in-app &amp; push invite
                </p>
                {friends.map((f) => {
                  const u = f?.user || {};
                  const username = u.username;
                  if (!username) return null;
                  const isInviting = invitingUsername === username;
                  return (
                    <div key={f.friendshipId || username} className="domino-friend-row">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-white truncate">
                          {u.name || username}
                        </div>
                        <div className="text-[11px] text-white/40 truncate">
                          @{username}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="domino-invite-btn"
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
        ) : activeBoard.length === 0 ? (
          <div className="domino-empty-board">Play any tile to start</div>
        ) : (
          <div className="domino-board-rows">
            {rows.map((rowItems, rIdx) => (
              <div
                key={rIdx}
                className={`domino-board-row ${rIdx % 2 === 1 ? 'domino-board-row-rev' : ''}`}
              >
                {rowItems.map((item) => (
                  <DominoTile
                    key={item.idx}
                    a={item.displayA}
                    b={item.displayB}
                    horizontal={!item.isDouble}
                    mini
                  />
                ))}
              </div>
            ))}
          </div>
        )}

        {selectedIdx !== null && isMyTurnNow && activeBoard.length > 0 && (
          <div className="domino-side-picker">
            <button
              type="button"
              className="domino-side-btn"
              onClick={() => (mode === 'bot' ? handleBotSidePick('left') : handleOnlineSidePick('left'))}
            >
              Play Left ({activeLeftVal})
            </button>
            <button
              type="button"
              className="domino-side-btn"
              onClick={() => (mode === 'bot' ? handleBotSidePick('right') : handleOnlineSidePick('right'))}
            >
              Play Right ({activeRightVal})
            </button>
          </div>
        )}
      </div>

      {/* Bottom */}
      {(mode === 'bot' || isFriendActiveBoard) && (
        <div id="domino-bottom">
          <div className="domino-status">
            {mode === 'bot' ? botBanner : friendBanner}
          </div>

          <div className="domino-hand">
            {activeHand.map((tile, idx) => {
              const fit = canPlayTile(tile, activeBoard, activeLeftVal, activeRightVal);
              const playable = isMyTurnNow && (fit.left || fit.right);
              return (
                <DominoTile
                  key={`${tile[0]}-${tile[1]}-${idx}`}
                  a={tile[0]}
                  b={tile[1]}
                  clickable={playable}
                  selected={selectedIdx === idx}
                  dimmed={isMyTurnNow && !playable}
                  onClick={() => (mode === 'bot' ? handleBotTileClick(idx) : handleOnlineTileClick(idx))}
                />
              );
            })}
          </div>

          <div className="domino-actions">
            {showDrawOrPass && (
              <button
                type="button"
                className="domino-action-btn"
                onClick={() => {
                  if (mode === 'bot') {
                    handleBotDrawOrPass();
                  } else if (onlineState?.canDraw) {
                    handleOnlineAction({ action: 'draw' });
                  } else if (onlineState?.canPass) {
                    handleOnlineAction({ action: 'pass' });
                  }
                }}
              >
                {activePileCount > 0 ? `Draw (${activePileCount})` : 'Pass'}
              </button>
            )}

            {mode === 'bot' ? (
              confirmRestart && !isGameEnded ? (
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <span>Restart game?</span>
                  <button
                    type="button"
                    className="domino-action-btn !py-1 !px-3 !text-xs"
                    onClick={() => {
                      setConfirmRestart(false);
                      restartBotRound(false);
                    }}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    className="domino-restart-link !text-xs !px-2"
                    onClick={() => setConfirmRestart(false)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="domino-restart-link"
                  onClick={() => {
                    if (isGameEnded) {
                      restartBotRound(false);
                    } else {
                      setConfirmRestart(true);
                    }
                  }}
                >
                  Restart
                </button>
              )
            ) : (
              isGameEnded && (
                <button
                  type="button"
                  className="domino-restart-link"
                  onClick={() => handleOnlineAction({ action: 'rematch' })}
                >
                  Play again
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
