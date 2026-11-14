'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Lock, Globe, Users, Copy, Check, Plus, Headphones, Zap } from 'lucide-react';

const DEMO_ROOMS_LIST = [
  {
    id: 'demo-room-1',
    code: 'BK4829',
    name: 'Late Night Algorithms',
    visibility: 'friends',
    isHost: false,
    hostName: 'Omar',
    hostUsername: 'omar',
    startedAt: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
    memberCount: 2,
    members: [
      { id: 'm1', userId: 'u1', username: 'omar', name: 'Omar', topic: 'Dynamic Programming', elapsedSeconds: 2520, modeLabel: 'Deep Flow · PHASE 2' },
      { id: 'm2', userId: 'u2', username: 'sara', name: 'Sara', topic: 'Linear Algebra', elapsedSeconds: 1140, modeLabel: 'Pomodoro' },
    ],
  },
  {
    id: 'demo-room-2',
    code: 'PUB912',
    name: 'Quiet Engineering Hall',
    visibility: 'public',
    isHost: false,
    hostName: 'Youssef',
    hostUsername: 'youssef',
    startedAt: new Date(Date.now() - 68 * 60 * 1000).toISOString(),
    memberCount: 3,
    members: [
      { id: 'm3', userId: 'u3', username: 'youssef', name: 'Youssef', topic: 'System Design', elapsedSeconds: 4080, modeLabel: 'Deep Flow · PHASE 3' },
      { id: 'm4', userId: 'u4', username: 'mona', name: 'Mona', topic: 'Organic Chemistry', elapsedSeconds: 1920, modeLabel: 'Deep Flow · PHASE 2' },
      { id: 'm5', userId: 'u5', username: 'ahmed', name: 'Ahmed', topic: 'OS Notes', elapsedSeconds: 900, modeLabel: 'Flight Focus' },
    ],
  },
];

function formatElapsed(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export default function StudyGroupModal({
  isOpen,
  onClose,
  isPreview = false,
  apiFetch,
  onOpenDeepFlow,
  onOpenSoundLibrary,
}) {
  const [loading, setLoading] = useState(true);
  const [myRoom, setMyRoom] = useState(null);
  const [friendRooms, setFriendRooms] = useState([]);
  const [publicRooms, setPublicRooms] = useState([]);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('rooms'); // 'rooms' | 'host'

  // Host form
  const [roomName, setRoomName] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [creating, setCreating] = useState(false);

  // Join by code
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  // In-room states
  const [myTopic, setMyTopic] = useState('');
  const [isEditingTopic, setIsEditingTopic] = useState(false);
  const [topicDraft, setTopicDraft] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [tick, setTick] = useState(0);
  const [quietJoinName, setQuietJoinName] = useState(null);
  const prevMemberIdsRef = useRef(new Set());

  const fetcher = apiFetch || fetch;

  const loadRooms = async (silent = false) => {
    if (isPreview) {
      setLoading(false);
      if (!myRoom) {
        setFriendRooms([DEMO_ROOMS_LIST[0]]);
        setPublicRooms([DEMO_ROOMS_LIST[1]]);
      }
      return;
    }
    if (!silent) setLoading(true);
    try {
      const res = await fetcher('/api/rooms');
      if (!res.ok) {
        if (res.status === 401) setError('Sign in to host or join live rooms.');
        setLoading(false);
        return;
      }
      const data = await res.json();
      const incomingRoom = data.myRoom || null;

      if (incomingRoom && myRoom && incomingRoom.id === myRoom.id) {
        const newMember = (incomingRoom.members || []).find(
          (m) => !prevMemberIdsRef.current.has(m.userId)
        );
        if (newMember) setQuietJoinName(newMember.name);
      }
      if (incomingRoom) {
        prevMemberIdsRef.current = new Set((incomingRoom.members || []).map((m) => m.userId));
      } else {
        prevMemberIdsRef.current = new Set();
      }

      setMyRoom(incomingRoom);
      setFriendRooms(Array.isArray(data.friendRooms) ? data.friendRooms : []);
      setPublicRooms(Array.isArray(data.publicRooms) ? data.publicRooms : []);
      setError('');
    } catch {
      setError('Could not load rooms.');
    } finally {
      setLoading(false);
    }
  };

  // Load once on open (zero periodic polling!)
  useEffect(() => {
    if (!isOpen) return;
    loadRooms();
  }, [isOpen, isPreview]);

  // Real-time SSE stream while in an active room (0 DB queries, pushes from server RAM on join/leave/topic/end)
  useEffect(() => {
    if (!isOpen || isPreview || !myRoom?.id) return;
    const es = new EventSource(`/api/rooms/stream?roomId=${encodeURIComponent(myRoom.id)}`);
    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.room === null) {
          setMyRoom(null);
          prevMemberIdsRef.current = new Set();
          loadRooms(true);
          return;
        }
        if (payload.room) {
          const incoming = payload.room;
          const newMember = (incoming.members || []).find(
            (m) => !prevMemberIdsRef.current.has(m.userId)
          );
          if (newMember) setQuietJoinName(newMember.name);
          prevMemberIdsRef.current = new Set((incoming.members || []).map((m) => m.userId));
          setMyRoom((prev) => ({
            ...incoming,
            isHost: prev ? prev.isHost : incoming.isHost,
          }));
        }
      } catch {}
    };
    return () => {
      es.close();
    };
  }, [isOpen, isPreview, myRoom?.id]);

  // Cleanly notify server if user closes the browser tab while in a room
  useEffect(() => {
    if (isPreview || !myRoom) return;
    const handlePageHide = () => {
      try {
        fetch('/api/rooms', {
          method: 'POST',
          keepalive: true,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: myRoom.isHost ? 'end' : 'leave',
            roomId: myRoom.id,
          }),
        }).catch(() => {});
      } catch {}
    };
    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
  }, [myRoom?.id, myRoom?.isHost, isPreview]);

  useEffect(() => {
    if (!isOpen || !myRoom) return;
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [isOpen, myRoom?.id]);

  useEffect(() => {
    if (!quietJoinName) return;
    const t = setTimeout(() => setQuietJoinName(null), 6500);
    return () => clearTimeout(t);
  }, [quietJoinName]);

  if (!isOpen) return null;

  const handleCreateRoom = async (e) => {
    e?.preventDefault();
    setError('');
    if (isPreview) {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      setMyRoom({
        id: 'preview-hosted-' + Date.now(),
        code,
        name: roomName.trim() || 'Quiet Room',
        visibility,
        isHost: true,
        hostName: 'You',
        hostUsername: 'you',
        startedAt: new Date().toISOString(),
        memberCount: 1,
        members: [
          { id: 'me', userId: 'me', username: 'you', name: 'You', topic: myTopic, elapsedSeconds: 0, modeLabel: 'Deep Flow · PHASE 1' },
        ],
      });
      setRoomName('');
      return;
    }

    setCreating(true);
    try {
      const res = await fetcher('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name: roomName.trim() || 'Quiet Room',
          visibility,
          topic: myTopic,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not create room.');
      } else {
        prevMemberIdsRef.current = new Set((data.room?.members || []).map((m) => m.userId));
        setMyRoom(data.room);
        setRoomName('');
      }
    } catch {
      setError('Network error creating room.');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinRoom = async ({ roomId, code, demoRoom } = {}) => {
    setError('');
    if (isPreview) {
      const normalizedCode = (code || '').trim().toUpperCase();
      const target = demoRoom || DEMO_ROOMS_LIST.find((r) => r.id === roomId || (normalizedCode && r.code === normalizedCode));
      if (!target) {
        setError('Room not found or has ended.');
        return;
      }
      setMyRoom({
        ...target,
        isHost: false,
        memberCount: target.members.length + 1,
        members: [
          ...target.members,
          { id: 'me', userId: 'me', username: 'you', name: 'You', topic: myTopic, elapsedSeconds: 0, modeLabel: 'In Room' },
        ],
      });
      setJoinCode('');
      return;
    }

    setJoining(true);
    try {
      const res = await fetcher('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', roomId, code, topic: myTopic }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not join room.');
      } else {
        prevMemberIdsRef.current = new Set((data.room?.members || []).map((m) => m.userId));
        setMyRoom(data.room);
        setJoinCode('');
      }
    } catch {
      setError('Network error joining room.');
    } finally {
      setJoining(false);
    }
  };

  const handleLeaveOrEnd = async () => {
    if (!myRoom) return;
    const action = myRoom.isHost ? 'end' : 'leave';
    if (isPreview) {
      setMyRoom(null);
      return;
    }
    try {
      await fetcher('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, roomId: myRoom.id }),
      });
      setMyRoom(null);
      loadRooms(true);
    } catch {}
  };

  const handleToggleVisibility = async () => {
    if (!myRoom || !myRoom.isHost) return;
    const order = ['private', 'friends', 'public'];
    const nextVis = order[(order.indexOf(myRoom.visibility) + 1) % order.length];
    setMyRoom({ ...myRoom, visibility: nextVis });
    if (isPreview) return;
    await fetcher('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'visibility', roomId: myRoom.id, visibility: nextVis }),
    }).catch(() => {});
  };

  const handleSaveTopic = async () => {
    const clean = topicDraft.trim();
    setMyTopic(clean);
    setIsEditingTopic(false);
    if (!myRoom) return;
    if (isPreview) {
      setMyRoom({
        ...myRoom,
        members: myRoom.members.map((m) => (m.id === 'me' ? { ...m, topic: clean } : m)),
      });
      return;
    }
    const res = await fetcher('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'heartbeat', roomId: myRoom.id, topic: clean }),
    }).catch(() => null);
    if (res && res.ok) {
      const d = await res.json();
      if (d.room) setMyRoom(d.room);
    }
  };

  const handleCopyCode = () => {
    if (!myRoom?.code) return;
    navigator.clipboard?.writeText(myRoom.code).catch(() => {});
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1800);
  };

  const roomElapsed = myRoom
    ? Math.max(0, Math.floor((Date.now() - new Date(myRoom.startedAt).getTime()) / 1000))
    : 0;

  const allRooms = [...friendRooms, ...publicRooms];

  return (
    <div className="fixed inset-0 z-[10000] bg-black text-white overflow-y-auto select-none animate-in fade-in duration-200">
      <div className="min-h-screen w-full max-w-[440px] mx-auto px-5 pt-[calc(env(safe-area-inset-top,0px)+2.25rem)] sm:pt-[calc(env(safe-area-inset-top,0px)+2.5rem)] pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] flex flex-col justify-between">
        
        {/* HEADER */}
        <header className="flex items-center justify-between h-14 shrink-0">
          <div className="min-w-0">
            <h1 className="text-[19px] font-normal tracking-tight text-white leading-tight truncate">
              {myRoom ? myRoom.name : 'Study Group'}
            </h1>
            {myRoom ? (
              <div className="flex items-center gap-2 mt-0.5">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="font-mono text-[10px] uppercase tracking-widest text-white/50 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  {copiedCode ? <Check size={10} /> : <Copy size={10} />}
                  <span>{copiedCode ? 'Copied' : myRoom.code}</span>
                </button>
                <span className="text-white/25">·</span>
                {myRoom.isHost ? (
                  <button
                    type="button"
                    onClick={handleToggleVisibility}
                    className="font-mono text-[10px] uppercase tracking-widest text-white/50 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    {myRoom.visibility === 'public' ? <Globe size={10} /> : myRoom.visibility === 'friends' ? <Users size={10} /> : <Lock size={10} />}
                    <span>{myRoom.visibility}</span>
                  </button>
                ) : (
                  <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                    {myRoom.visibility}
                  </span>
                )}
              </div>
            ) : (
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/40 mt-0.5">
                QUIET ROOMS
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {myRoom && (
              <button
                type="button"
                onClick={handleLeaveOrEnd}
                className="px-3.5 h-9 rounded-full border border-white/[0.16] text-white/70 hover:text-white hover:border-white/40 font-mono text-[10px] uppercase tracking-widest transition-all cursor-pointer"
              >
                {myRoom.isHost ? 'End' : 'Leave'}
              </button>
            )}
            {onOpenSoundLibrary && (
              <button
                onClick={onOpenSoundLibrary}
                aria-label="Sound Library"
                className="w-9 h-9 flex items-center justify-center rounded-full border border-white/[0.14] text-white/70 hover:bg-white hover:text-black transition-all cursor-pointer"
              >
                <Headphones size={16} />
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-9 h-9 flex items-center justify-center rounded-full border border-white/[0.14] text-white/55 hover:text-white transition-all cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        {error && (
          <div className="my-3 px-3 py-2 border border-white/20 rounded-xl text-[11px] text-white/80 font-mono">
            {error}
          </div>
        )}

        {/* ================================================================= */}
        {/* ACTIVE ROOM VIEW (Minimalist Quiet Room)                          */}
        {/* ================================================================= */}
        {myRoom ? (
          <div className="flex-1 flex flex-col justify-between py-4">
            <div>
              {quietJoinName && (
                <div className="flex justify-center mb-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.14] text-white/65 font-mono text-[10px] tracking-wider animate-in fade-in duration-300">
                    <span className="w-1 h-1 rounded-full bg-white/70" />
                    <span>{quietJoinName} joined quietly</span>
                  </div>
                </div>
              )}

              {/* Hero Timer */}
              <div className="flex flex-col items-center py-6">
                <div className="text-[60px] font-light text-white leading-none tabular-nums tracking-tight">
                  {formatElapsed(roomElapsed + (tick * 0))}
                </div>

                {/* Inline Topic */}
                <div className="mt-4">
                  {isEditingTopic ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={topicDraft}
                        onChange={(e) => setTopicDraft(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveTopic()}
                        placeholder="Your topic..."
                        autoFocus
                        className="bg-transparent border-b border-white/30 py-0.5 text-[13px] text-white text-center placeholder:text-white/30 focus:outline-none focus:border-white w-44"
                      />
                      <button
                        type="button"
                        onClick={handleSaveTopic}
                        className="text-[11px] font-mono uppercase text-white underline underline-offset-4 cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setTopicDraft(myTopic);
                        setIsEditingTopic(true);
                      }}
                      className="text-[13px] text-white/50 hover:text-white transition-colors cursor-pointer"
                    >
                      {myTopic || 'Tap to set your topic'}
                    </button>
                  )}
                </div>
              </div>

              {/* Clean Participants List */}
              <div className="divide-y divide-white/[0.1] border-y border-white/[0.12] my-4">
                {myRoom.members.map((m) => (
                  <div key={m.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[14px] font-normal text-white truncate">
                        {m.name}
                      </div>
                      <div className="text-[11px] text-white/45 truncate mt-0.5">
                        {m.topic ? `${m.topic} · ` : ''}{m.modeLabel}
                      </div>
                    </div>
                    <span className="font-mono text-[11px] text-white/60 tabular-nums shrink-0">
                      {Math.floor((m.elapsedSeconds + tick) / 60)}m
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {onOpenDeepFlow && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDeepFlow();
                }}
                className="w-full h-12 rounded-full bg-white text-black font-medium text-[14px] flex items-center justify-center gap-2 hover:bg-white/90 active:scale-[0.98] transition-all cursor-pointer mt-4"
              >
                <Zap size={15} />
                <span>Open Deep Flow</span>
              </button>
            )}
          </div>
        ) : (
          /* ================================================================= */
          /* LOBBY VIEW (2 Simple Tabs: Rooms | Host)                          */
          /* ================================================================= */
          <div className="flex-1 flex flex-col pt-3">
            {/* Simple 2-Tab Switcher */}
            <div className="grid grid-cols-2 p-1 rounded-full border border-white/[0.12] mb-6">
              <button
                type="button"
                onClick={() => setTab('rooms')}
                className={`h-9 rounded-full text-[12px] font-medium transition-all cursor-pointer ${
                  tab === 'rooms' ? 'bg-white text-black' : 'text-white/55 hover:text-white'
                }`}
              >
                Rooms
              </button>
              <button
                type="button"
                onClick={() => setTab('host')}
                className={`h-9 rounded-full text-[12px] font-medium transition-all cursor-pointer ${
                  tab === 'host' ? 'bg-white text-black' : 'text-white/55 hover:text-white'
                }`}
              >
                Host Room
              </button>
            </div>

            {tab === 'host' ? (
              <form onSubmit={handleCreateRoom} className="flex flex-col gap-5">
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="Room name (e.g. Finals Prep)"
                  maxLength={48}
                  autoFocus
                  className="w-full bg-transparent border-b border-white/20 py-3 text-[16px] text-white placeholder:text-white/30 focus:outline-none focus:border-white"
                />

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setVisibility('private')}
                    className={`h-11 rounded-full border text-[12px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      visibility === 'private'
                        ? 'bg-white text-black border-white'
                        : 'bg-transparent text-white/60 border-white/[0.14]'
                    }`}
                  >
                    <Lock size={12} />
                    <span>Private</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibility('friends')}
                    className={`h-11 rounded-full border text-[12px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      visibility === 'friends'
                        ? 'bg-white text-black border-white'
                        : 'bg-transparent text-white/60 border-white/[0.14]'
                    }`}
                  >
                    <Users size={12} />
                    <span>Friends</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibility('public')}
                    className={`h-11 rounded-full border text-[12px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      visibility === 'public'
                        ? 'bg-white text-black border-white'
                        : 'bg-transparent text-white/60 border-white/[0.14]'
                    }`}
                  >
                    <Globe size={12} />
                    <span>Public</span>
                  </button>
                </div>

                <p className="text-[12px] text-white/40">
                  {visibility === 'private'
                    ? 'Hidden from the list. Only people with the invite code can join.'
                    : visibility === 'friends'
                    ? 'Visible to your friends in the list, or anyone with the code.'
                    : 'Visible and open for anyone on bokra to join.'}
                </p>

                <button
                  type="submit"
                  disabled={creating}
                  className="w-full h-12 rounded-full bg-white text-black font-medium text-[14px] flex items-center justify-center gap-2 hover:bg-white/90 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 mt-2"
                >
                  <Plus size={15} />
                  <span>{creating ? 'Creating...' : 'Create Room'}</span>
                </button>
              </form>
            ) : (
              <div className="flex flex-col gap-5">
                {/* Compact Join by Code */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="Room code"
                    maxLength={8}
                    className="flex-1 bg-transparent border-b border-white/20 py-2 text-[14px] font-mono uppercase tracking-widest text-white placeholder:text-white/30 focus:outline-none focus:border-white"
                  />
                  <button
                    type="button"
                    disabled={joining || !joinCode.trim()}
                    onClick={() => handleJoinRoom({ code: joinCode })}
                    className="px-4 h-9 rounded-full bg-white text-black text-[12px] font-medium disabled:opacity-30 transition-all cursor-pointer"
                  >
                    Join
                  </button>
                </div>

                {/* Unified Rooms List */}
                {loading ? (
                  <div className="py-10 text-center font-mono text-[11px] text-white/35">Loading...</div>
                ) : allRooms.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-[14px] text-white/50">No active rooms right now</p>
                    <button
                      type="button"
                      onClick={() => setTab('host')}
                      className="mt-3 text-[12px] font-mono uppercase tracking-wider text-white underline underline-offset-4 cursor-pointer"
                    >
                      Host one
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.1] border-y border-white/[0.12]">
                    {allRooms.map((r) => (
                      <div key={r.id} className="py-3.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[15px] font-normal text-white truncate">{r.name}</div>
                          <div className="font-mono text-[10px] text-white/45 mt-0.5 flex items-center gap-1.5">
                            <span>{r.hostName}</span>
                            <span>·</span>
                            <span>{r.visibility === 'private' ? 'Private' : r.visibility === 'friends' ? 'Friends' : 'Public'}</span>
                            <span>·</span>
                            <span>{r.memberCount} in room</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleJoinRoom({ roomId: r.id, demoRoom: r })}
                          className="px-4 py-1.5 rounded-full bg-white text-black text-[12px] font-medium shrink-0 hover:bg-white/90 cursor-pointer"
                        >
                          Join
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
