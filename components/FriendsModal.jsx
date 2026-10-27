"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Users, Plus, X, Search, Check, Copy, Share2, 
  Shield, AlertCircle, Loader2, ChevronLeft, ChevronRight,
  Music, Plane, Clock, Sparkles, MoreHorizontal, ShieldAlert, Trash2, Lock
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { translations } from '@/lib/translations';

// Default presence presets to enrich friends with realistic activity states
const PRESENCE_PRESETS = [
  {
    kind: 'focus',
    tag: 'Focus',
    line: 'Focus 15:19 · Weightless',
    right: '15:19',
    status: 'Studying · listening to Spotify',
    label: 'FOCUS SESSION',
    big: '15:19',
    bigSize: 56,
    sub: 'left · cycle 2 of 4',
    pct: 62,
    hasBar: true,
    barL: '10:41 done',
    barR: '25:00',
    hasChips: false,
    chips: [],
    hasDots: true,
    dots: [1, 1, 0, 0],
    action: 'Join session',
    together: '6h 20m',
    hasMusicBadge: true,
    hasSec: true,
    secTitle: 'Weightless',
    secSub: 'Marconi Union · on Spotify',
    secPct: 38,
  },
  {
    kind: 'flight',
    tag: 'Flight',
    line: 'CAI → DXB · in the air',
    right: '40 min',
    status: 'On a focus flight',
    label: 'FOCUS FLIGHT',
    big: 'CAI → DXB',
    bigSize: 38,
    sub: 'Cairo to Dubai · 40 min left',
    pct: 45,
    hasBar: true,
    barL: 'CAI',
    barR: 'DXB',
    hasChips: false,
    chips: [],
    hasDots: false,
    dots: [],
    action: 'Hop on this flight',
    together: '3h 05m',
    hasMusicBadge: false,
    hasSec: false,
  },
  {
    kind: 'music',
    tag: 'Music',
    line: 'Midnight City · M83',
    right: '1:24',
    status: 'Listening on Spotify',
    label: 'LISTENING TO',
    big: 'Midnight City',
    bigSize: 34,
    sub: 'M83',
    pct: 38,
    hasBar: true,
    barL: '1:24',
    barR: '4:03',
    hasChips: false,
    chips: [],
    hasDots: false,
    dots: [],
    action: 'Listen along',
    together: '1h 40m',
    hasMusicBadge: true,
    hasSec: false,
  },
  {
    kind: 'lecture',
    tag: 'Lecture',
    line: 'In lecture · TT284 · GE4',
    right: '48 min',
    status: 'In a lecture',
    label: 'IN LECTURE',
    big: 'TT284',
    bigSize: 44,
    sub: 'Ends in 48 min',
    pct: 0,
    hasBar: false,
    barL: '',
    barR: '',
    hasChips: true,
    chips: ['11:30 AM', 'GE4', 'Weekly'],
    hasDots: false,
    dots: [],
    action: 'Plan a study session',
    together: '2h 10m',
    hasMusicBadge: false,
    hasSec: false,
  },
  {
    kind: 'habit',
    tag: 'Habit',
    line: 'Just finished Prayers 5/5',
    right: '5/5',
    status: 'Finished a habit',
    label: 'JUST FINISHED',
    big: 'Prayers 5/5',
    bigSize: 40,
    sub: 'Streak: 12 days',
    pct: 100,
    hasBar: false,
    barL: '',
    barR: '',
    hasChips: false,
    chips: [],
    hasDots: true,
    dots: [1, 1, 1, 1, 1],
    action: 'Cheer them on',
    together: '4h 30m',
    hasMusicBadge: false,
    hasSec: false,
  },
  {
    kind: 'idle',
    tag: 'Idle',
    line: 'Idle · last seen 2h ago',
    right: '2h',
    status: 'Not active',
    label: 'IDLE',
    big: 'Last seen 2h ago',
    bigSize: 28,
    sub: 'No activity right now',
    pct: 0,
    hasBar: false,
    barL: '',
    barR: '',
    hasChips: false,
    chips: [],
    hasDots: false,
    dots: [],
    action: 'Ask to study',
    together: '0h',
    hasMusicBadge: false,
    hasSec: false,
  },
];

const DEMO_FRIENDS = [
  {
    friendshipId: 'demo-ahmed',
    user: { username: 'ahmed', name: 'Ahmed' },
    displayName: 'Ahmed',
    initial: 'A',
    presence: PRESENCE_PRESETS[0],
  },
  {
    friendshipId: 'demo-sara',
    user: { username: 'sara', name: 'Sara' },
    displayName: 'Sara',
    initial: 'S',
    presence: PRESENCE_PRESETS[1],
  },
  {
    friendshipId: 'demo-omar',
    user: { username: 'omar', name: 'Omar' },
    displayName: 'Omar',
    initial: 'O',
    presence: PRESENCE_PRESETS[2],
  },
  {
    friendshipId: 'demo-mona',
    user: { username: 'mona', name: 'Mona' },
    displayName: 'Mona',
    initial: 'M',
    presence: PRESENCE_PRESETS[3],
  },
  {
    friendshipId: 'demo-youssef',
    user: { username: 'youssef', name: 'Youssef' },
    displayName: 'Youssef',
    initial: 'Y',
    presence: PRESENCE_PRESETS[4],
  },
  {
    friendshipId: 'demo-hana',
    user: { username: 'hana', name: 'Hana' },
    displayName: 'Hana',
    initial: 'H',
    presence: PRESENCE_PRESETS[5],
  },
];

export default function FriendsModal({ 
  isOpen, 
  onClose, 
  myUsername = '', 
  myName = '',
  myAvatar = 'boy1',
  lang = 'en', 
  themeColor = '#FF9F0A' 
}) {
  const isRtl = lang === 'ar';
  const t = useCallback((k) => translations[lang]?.[k] || translations.en[k] || k, [lang]);

  // Views: 'main' | 'add' | 'privacy'
  const [view, setView] = useState('main');
  
  // Data State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [blocked, setBlocked] = useState([]);

  // Selected friend for presence bottom sheet
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [showManageSheet, setShowManageSheet] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Search state in Add Friend view
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null); // { user, relation, friendshipId }
  const [searchError, setSearchError] = useState(null);
  const [searchPerformed, setSearchPerformed] = useState(false);

  // Refs to prevent duplicate fetches, infinite loops, and flickering across re-renders
  const lastQueryRef = useRef('');
  const searchCacheRef = useRef({});
  const [requestSending, setRequestSending] = useState(false);

  // In-list filter state
  const [listFilter, setListFilter] = useState('');

  // Password Protection (admin2005)
  const [isUnlocked, setIsUnlocked] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('bokra_friends_unlocked') === 'true';
    }
    return false;
  });
  const [enteredPassword, setEnteredPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (enteredPassword.trim() === 'admin2005') {
      setIsUnlocked(true);
      setPasswordError(false);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('bokra_friends_unlocked', 'true');
      }
    } else {
      setPasswordError(true);
    }
  };

  // Privacy switches state
  const [ghostMode, setGhostMode] = useState(false);
  const [privacySettings, setPrivacySettings] = useState({
    focusSessions: true,
    focusFlights: true,
    scheduledHabits: true,
    spotify: false,
    habits: true,
  });

  // Load saved privacy settings on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedGhost = localStorage.getItem('bokra_privacy_ghost');
        if (savedGhost !== null) setGhostMode(savedGhost === 'true');
        const savedSettings = localStorage.getItem('bokra_privacy_settings');
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          setPrivacySettings((prev) => ({ ...prev, ...parsed }));
        }
      } catch (_) {}
    }

    apiFetch('/api/user/privacy')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.privacySettings && typeof data.privacySettings === 'object') {
          const s = data.privacySettings;
          if (typeof s.ghostMode === 'boolean') setGhostMode(s.ghostMode);
          setPrivacySettings({
            focusSessions: s.focusSessions !== false,
            focusFlights: s.focusFlights !== false,
            scheduledHabits: s.scheduledHabits !== false && s.lectures !== false,
            spotify: s.spotify !== false,
            habits: s.habits !== false,
          });
        }
      })
      .catch(() => {});
  }, []);

  const savePrivacy = (newGhost, newSettings) => {
    const payload = {
      ghostMode: newGhost,
      ...newSettings,
      lectures: newSettings.scheduledHabits,
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem('bokra_privacy_ghost', String(newGhost));
      localStorage.setItem('bokra_privacy_settings', JSON.stringify(newSettings));
    }
    apiFetch('/api/user/privacy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  };

  // Copied username indicator
  const [copied, setCopied] = useState(false);

  // Lock background body scroll while Friends modal is open to ensure smooth scrolling
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
    };
  }, [isOpen]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // Fetch Friends Data
  const loadFriends = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch('/api/friends');
      if (!res.ok) {
        throw new Error('Failed to load friends');
      }
      const data = await res.json();
      setFriends(Array.isArray(data.friends) ? data.friends : []);
      setIncoming(Array.isArray(data.incoming) ? data.incoming : []);
      setOutgoing(Array.isArray(data.outgoing) ? data.outgoing : []);
      setBlocked(Array.isArray(data.blocked) ? data.blocked : []);
    } catch (err) {
      console.warn('[Friends API Load Error]:', err);
      setError('Unable to load friends. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadFriends();
      setView('main');
      setSelectedFriend(null);
      setShowManageSheet(false);
      setSearchQuery('');
      setSearchResult(null);
      setSearchPerformed(false);
    }
  }, [isOpen, loadFriends]);

  // Debounced search effect with cache and duplicate suppression
  useEffect(() => {
    if (view !== 'add') {
      lastQueryRef.current = '';
      return;
    }

    const clean = searchQuery.trim().toLowerCase().replace(/^@/, '');
    if (clean.length < 4) {
      lastQueryRef.current = '';
      setSearchResult(null);
      setSearchPerformed(false);
      setSearchError(null);
      setSearching(false);
      return;
    }

    // If query hasn't changed from last executed search, don't re-run
    if (clean === lastQueryRef.current) {
      return;
    }

    // Check memory cache first
    if (searchCacheRef.current[clean]) {
      lastQueryRef.current = clean;
      setSearchResult(searchCacheRef.current[clean]);
      setSearchPerformed(true);
      setSearchError(null);
      setSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      if (clean === lastQueryRef.current) return;

      setSearching(true);
      setSearchError(null);
      try {
        const res = await apiFetch(`/api/friends/search?username=${encodeURIComponent(clean)}`);
        if (res.status === 429) {
          setSearchError(translations[lang]?.tooManyRequests || translations.en?.tooManyRequests || 'Too many requests. Please wait a moment.');
          setSearchResult(null);
          setSearchPerformed(true);
          return;
        }
        if (!res.ok) {
          throw new Error('Search failed');
        }
        const data = await res.json();
        searchCacheRef.current[clean] = data;
        lastQueryRef.current = clean;
        setSearchResult(data);
        setSearchPerformed(true);
      } catch (err) {
        setSearchError('Search failed. Check your connection.');
        setSearchResult(null);
        setSearchPerformed(true);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, view, lang]);

  // Assign presence: use real presence from API, or fallback to demo friends if 0 friends
  const friendsWithPresence = useMemo(() => {
    if (friends.length === 0 && incoming.length === 0 && outgoing.length === 0) {
      return DEMO_FRIENDS;
    }
    return friends.map((f) => {
      const friendName = f.user?.name || f.user?.username || 'Friend';
      const initial = (friendName[0] || 'F').toUpperCase();
      const presence = f.presence || {
        kind: 'idle',
        tag: 'Idle',
        line: 'Idle · not active',
        right: 'Now',
        status: 'Not active',
        label: 'IDLE',
        big: 'Active just now',
        bigSize: 28,
        sub: 'No activity right now',
        pct: 0,
        hasBar: false,
        barL: '',
        barR: '',
        hasChips: false,
        chips: [],
        hasDots: false,
        dots: [],
        action: 'Ask to study',
        together: '0h',
        hasMusicBadge: false,
        hasSec: false,
      };

      return {
        ...f,
        initial,
        displayName: friendName,
        presence,
      };
    });
  }, [friends, incoming, outgoing]);

  // Keep selectedFriend in sync with live presence updates
  useEffect(() => {
    if (!selectedFriend) return;
    const updated = friendsWithPresence.find((f) => f.friendshipId === selectedFriend.friendshipId);
    if (updated && JSON.stringify(updated.presence) !== JSON.stringify(selectedFriend.presence)) {
      setSelectedFriend(updated);
    }
  }, [friendsWithPresence, selectedFriend]);

  // Live polling for friends presence while modal is open (every 10s)
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      apiFetch('/api/friends')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.friends)) setFriends(data.friends);
          if (Array.isArray(data.incoming)) setIncoming(data.incoming);
          if (Array.isArray(data.outgoing)) setOutgoing(data.outgoing);
        })
        .catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Count active friends (kind !== 'idle')
  const activeFriendsCount = useMemo(() => {
    return friendsWithPresence.filter((f) => f.presence.kind === 'focus' || f.presence.kind === 'flight' || f.presence.kind === 'music' || f.presence.kind === 'lecture').length;
  }, [friendsWithPresence]);

  // Action: Accept / Decline Request (Optimistic)
  const handleRespond = async (friendshipId, action) => {
    const prevIncoming = [...incoming];
    const prevFriends = [...friends];

    const targetItem = incoming.find((i) => i.friendshipId === friendshipId);
    if (!targetItem) return;

    // Optimistic Update
    setIncoming((prev) => prev.filter((i) => i.friendshipId !== friendshipId));
    if (action === 'accept') {
      setFriends((prev) => [targetItem, ...prev]);
    }

    try {
      const res = await apiFetch('/api/friends/respond', {
        method: 'POST',
        body: JSON.stringify({ friendshipId, action }),
      });
      if (!res.ok) {
        throw new Error('Action failed');
      }
    } catch (err) {
      // Rollback
      setIncoming(prevIncoming);
      setFriends(prevFriends);
      showToast('Action failed. Rolling back.');
    }
  };

  // Action: Send Friend Request
  const handleSendRequest = async (username) => {
    if (!username || requestSending) return;
    setRequestSending(true);
    try {
      const res = await apiFetch('/api/friends/request', {
        method: 'POST',
        body: JSON.stringify({ username }),
      });
      const data = await res.json();

      if (res.status === 429) {
        showToast(t('tooManyRequests'));
        return;
      }
      if (!res.ok) {
        showToast(data.error === 'not_available' ? t('userNotFound') : 'Could not send request');
        return;
      }

      if (data.result === 'sent') {
        showToast('Friend request sent!');
        setSearchResult((prev) => prev ? { ...prev, relation: 'pending_sent' } : prev);
        loadFriends();
      } else if (data.result === 'accepted') {
        showToast('Friend request accepted!');
        setSearchResult((prev) => prev ? { ...prev, relation: 'friends' } : prev);
        loadFriends();
      } else if (data.result === 'already_sent') {
        showToast('Request already sent.');
      } else if (data.result === 'already_friends') {
        showToast(t('alreadyFriends'));
      }
    } catch (err) {
      showToast('Network error, please try again.');
    } finally {
      setRequestSending(false);
    }
  };

  // Action: Remove / Block / Unblock Friend
  const handleRemoveOrBlock = async (friendshipId, action) => {
    const prevFriends = [...friends];
    const prevBlocked = [...blocked];

    // Optimistic update
    if (action === 'remove' || action === 'block') {
      const target = friends.find((f) => f.friendshipId === friendshipId);
      setFriends((prev) => prev.filter((f) => f.friendshipId !== friendshipId));
      if (action === 'block' && target) {
        setBlocked((prev) => [target, ...prev]);
      }
      setSelectedFriend(null);
      setShowManageSheet(false);
    } else if (action === 'unblock') {
      setBlocked((prev) => prev.filter((b) => b.friendshipId !== friendshipId));
    }

    try {
      const res = await apiFetch('/api/friends/remove', {
        method: 'POST',
        body: JSON.stringify({ friendshipId, action }),
      });
      if (!res.ok) throw new Error('Action failed');
      showToast(action === 'block' ? 'User blocked' : action === 'unblock' ? 'User unblocked' : 'Friend removed');
    } catch (err) {
      // Rollback
      setFriends(prevFriends);
      setBlocked(prevBlocked);
      showToast('Action failed. Rolling back.');
    }
  };

  // Copy Username
  const handleCopyUsername = () => {
    if (!myUsername) return;
    navigator.clipboard.writeText(`@${myUsername}`);
    setCopied(true);
    showToast(t('copied'));
    setTimeout(() => setCopied(false), 2000);
  };

  // Share Invite Link
  const handleShare = async () => {
    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/?ref=${myUsername}` : '';
    const shareData = {
      title: 'bokra companion',
      text: `Add me on bokra: @${myUsername}`,
      url: shareUrl,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (_) {}
    } else {
      navigator.clipboard.writeText(shareUrl || `@${myUsername}`);
      showToast(t('copied'));
    }
  };

  if (!isOpen) return null;

  if (!isUnlocked) {
    return (
      <div className="fixed inset-0 z-[10005] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
        <div 
          dir={isRtl ? 'rtl' : 'ltr'}
          className="bg-[#121214] border border-white/10 rounded-3xl p-7 max-w-sm w-full text-center shadow-2xl flex flex-col items-center animate-in fade-in zoom-in-95"
        >
          <div className="w-14 h-14 rounded-2xl bg-white/10 text-white flex items-center justify-center mb-4 border border-white/10 shadow-lg">
            <Lock size={26} strokeWidth={2.5} />
          </div>
          <h3 className="text-xl font-black text-white mb-1.5 tracking-tight">
            {t('friendsTitle')}
          </h3>
          <p className="text-xs text-white/50 mb-6 leading-relaxed max-w-xs">
            {t('friendsPasswordRequired')}
          </p>

          <form onSubmit={handlePasswordSubmit} className="w-full flex flex-col gap-3">
            <input
              type="password"
              value={enteredPassword}
              onChange={(e) => {
                setEnteredPassword(e.target.value);
                if (passwordError) setPasswordError(false);
              }}
              placeholder={t('enterPassword')}
              autoFocus
              className="w-full bg-[#1c1c1e] border border-white/15 focus:border-white/40 px-4 py-3 rounded-2xl text-white text-center font-mono font-bold text-base outline-none transition-all placeholder:text-white/20"
            />

            {passwordError && (
              <span className="text-xs text-red-400 font-bold animate-fadeIn">
                {t('wrongPassword')}
              </span>
            )}

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-white text-black font-black text-sm hover:bg-white/90 active:scale-[0.98] transition-all shadow-lg cursor-pointer mt-1"
            >
              {t('unlock')}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-xs text-white/40 hover:text-white transition-colors cursor-pointer py-1.5"
            >
              {t('cancel') || 'Cancel'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Filtered friends list
  const cleanFilter = listFilter.trim().toLowerCase().replace(/^@/, '');
  const filteredFriends = friendsWithPresence.filter((f) => {
    if (!cleanFilter) return true;
    const u = (f.user?.username || '').toLowerCase();
    const n = (f.displayName || '').toLowerCase();
    return u.includes(cleanFilter) || n.includes(cleanFilter);
  });

  const isEmpty = friends.length === 0 && incoming.length === 0;

  // Helper for ring style
  const getRingStyle = (kind, pct) => {
    if (kind === 'idle') {
      return { border: '2px solid #2a2a2a' };
    }
    if (kind === 'lecture' || kind === 'habit') {
      return { border: '2px solid #ffffff' };
    }
    return {
      background: `conic-gradient(#ffffff 0 ${pct}%, #3a3a3a 0)`,
      padding: '2px',
    };
  };

  return (
    <div 
      dir={isRtl ? 'rtl' : 'ltr'} 
      className="fixed inset-0 z-[10005] bg-black overflow-y-auto overscroll-y-contain font-sans"
      style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
    >
      {/* Toast banner */}
      {toastMessage && (
        <div className="fixed top-6 z-[10040] left-1/2 -translate-x-1/2 bg-white text-black px-4 py-2 rounded-full font-bold text-xs shadow-2xl animate-in fade-in slide-in-from-top-4 duration-150">
          {toastMessage}
        </div>
      )}

      {/* Main Container */}
      <div className="w-full max-w-md min-h-full mx-auto px-5 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] pb-[calc(env(safe-area-inset-bottom,0px)+3rem)] flex flex-col justify-between relative">
        
        {/* ========================================================= */}
        {/* VIEW 1: MAIN FRIENDS LIST & PRESENCE STORY BAR            */}
        {/* ========================================================= */}
        {view === 'main' && (
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0"
                  aria-label="Back"
                >
                  <ChevronLeft size={20} className={isRtl ? 'rotate-180' : ''} />
                </button>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                    {t('friendsTitle')}
                  </h1>
                  {!isEmpty && (
                    <span className="text-[10px] font-bold tracking-widest text-[#b3b3b3] bg-[#171717] rounded-full px-2.5 py-1 uppercase shrink-0">
                      {activeFriendsCount} ACTIVE
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Add Friend Button */}
                <button
                  type="button"
                  onClick={() => setView('add')}
                  className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center font-bold hover:bg-white/90 shadow-lg active:scale-95 transition-all cursor-pointer"
                  title={t('addFriendTitle')}
                  aria-label={t('addFriendTitle')}
                >
                  <Plus size={22} strokeWidth={2.8} />
                </button>
              </div>
            </div>

            {/* Top Horizontal Presence Avatar Bar (Story Ring Bar) */}
            {!isEmpty && friendsWithPresence.length > 0 && (
              <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-3 mb-3 -mx-2 px-2">
                {friendsWithPresence.map((f) => {
                  const ring = getRingStyle(f.presence.kind, f.presence.pct);
                  return (
                    <button
                      key={`story-${f.friendshipId}`}
                      type="button"
                      onClick={() => {
                        setSelectedFriend(f);
                        setShowManageSheet(false);
                      }}
                      className="flex flex-col items-center gap-1.5 shrink-0 w-[52px] cursor-pointer group active:scale-95 transition-transform"
                    >
                      <div 
                        className="relative w-[50px] h-[50px] rounded-full flex items-center justify-center shrink-0"
                        style={ring}
                      >
                        <div className="w-full h-full rounded-full bg-[#1a1a1a] flex items-center justify-center text-white font-bold text-base">
                          {f.initial}
                        </div>
                        {f.presence.hasMusicBadge && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] rounded-full bg-white border-2 border-black flex items-center justify-center text-black shadow-md">
                            <Music size={9} strokeWidth={3} />
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold tracking-wider text-[#b3b3b3] group-hover:text-white transition-colors truncate max-w-full text-center">
                        {f.presence.tag}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* In-list Search Filter */}
            {!isEmpty && (
              <div className="relative flex items-center mb-5">
                <span className="absolute left-4 text-white/30 font-mono text-sm font-bold pointer-events-none select-none">
                  @
                </span>
                <input
                  type="text"
                  value={listFilter}
                  onChange={(e) => setListFilter(e.target.value)}
                  placeholder={t('searchUsername')}
                  className="w-full bg-[#121214] border border-white/10 focus:border-white/30 pl-9 pr-4 py-3 rounded-2xl text-white text-sm outline-none transition-all placeholder:text-white/30 font-medium"
                />
                {listFilter && (
                  <button
                    type="button"
                    onClick={() => setListFilter('')}
                    className="absolute right-3 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/40 hover:text-white cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            )}

            {/* Loading State */}
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-white/40 gap-3">
                <Loader2 size={24} className="animate-spin text-white/60" />
                <span className="text-xs font-medium">Loading friends...</span>
              </div>
            ) : isEmpty ? (
              /* EMPTY STATE: Study is better together */
              <div className="flex-1 flex flex-col items-center justify-center text-center my-auto py-6">
                {/* Concentric decorative circles */}
                <div className="relative w-48 h-48 rounded-full border border-white/10 flex items-center justify-center my-4">
                  <div className="w-32 h-32 rounded-full border border-white/15 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => setView('add')}
                      className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center shadow-2xl active:scale-95 transition-transform cursor-pointer"
                    >
                      <Plus size={28} strokeWidth={2.8} />
                    </button>
                  </div>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
                  {t('studyTogetherTitle')}
                </h2>
                <p className="text-xs sm:text-sm text-white/50 max-w-xs leading-relaxed mb-7">
                  {t('studyTogetherDesc')}
                </p>

                <div className="w-full flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => setView('add')}
                    className="w-full py-4 rounded-full bg-white text-black font-bold text-sm shadow-xl hover:bg-white/90 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    {t('addByUsername')}
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="w-full py-4 rounded-full border border-white/20 text-white font-bold text-sm hover:bg-white/5 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    {t('shareInviteLink')}
                  </button>
                </div>
              </div>
            ) : (
              /* POPULATED LIST */
              <div className="flex-1 flex flex-col gap-5">
                {/* Requests Section */}
                {incoming.length > 0 && (
                  <div className="flex flex-col gap-2.5">
                    <span className="text-[10px] font-bold tracking-widest text-white/40 uppercase px-1">
                      {t('requests')} · {incoming.length}
                    </span>
                    {incoming.map((item) => (
                      <div 
                        key={item.friendshipId}
                        className="bg-white text-black rounded-3xl p-3.5 flex items-center justify-between shadow-2xl animate-in fade-in duration-150"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-full bg-black text-white flex items-center justify-center font-bold text-base uppercase shrink-0">
                            {item.user?.name?.[0] || item.user?.username?.[0] || 'U'}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-black text-base truncate leading-tight">
                              {item.user?.name || item.user?.username}
                            </span>
                            <span className="text-black/50 text-xs font-mono truncate leading-tight mt-0.5">
                              @{item.user?.username}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleRespond(item.friendshipId, 'accept')}
                            className="bg-black text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-black/90 active:scale-95 transition-all cursor-pointer"
                          >
                            {t('accept')}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRespond(item.friendshipId, 'decline')}
                            className="w-8 h-8 rounded-full border border-black/15 flex items-center justify-center text-black/70 hover:text-black active:scale-90 transition-all cursor-pointer"
                            aria-label={t('decline')}
                          >
                            <X size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Friends Section */}
                <div className="flex flex-col gap-2.5">
                  <span className="text-[10px] font-bold tracking-widest text-white/40 uppercase px-1">
                    {t('friendsTitle')} · {filteredFriends.length}
                  </span>

                  {filteredFriends.length === 0 ? (
                    <div className="py-12 text-center text-white/30 text-xs">
                      No friends found matching &ldquo;{listFilter}&rdquo;
                    </div>
                  ) : (
                    filteredFriends.map((f) => {
                      const ring = getRingStyle(f.presence.kind, f.presence.pct);
                      return (
                        <div
                          key={f.friendshipId}
                          onClick={() => {
                            setSelectedFriend(f);
                            setShowManageSheet(false);
                          }}
                          className="bg-[#0d0d0d] hover:bg-white/[0.04] border border-[#2a2a2a] rounded-[22px] px-3.5 py-3 h-[76px] flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all select-none"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* Avatar with Ring */}
                            <div 
                              className="relative w-[48px] h-[48px] rounded-full flex items-center justify-center shrink-0"
                              style={ring}
                            >
                              <div className="w-full h-full rounded-full bg-[#1a1a1a] text-white flex items-center justify-center font-bold text-base uppercase">
                                {f.initial}
                              </div>
                              {f.presence.hasMusicBadge && (
                                <span className="absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] rounded-full bg-white border-2 border-[#0d0d0d] flex items-center justify-center text-black shadow-md">
                                  <Music size={9} strokeWidth={3} />
                                </span>
                              )}
                            </div>

                            <div className="flex flex-col min-w-0 flex-1 pr-2">
                              <span className="font-bold text-white text-[16px] truncate leading-tight">
                                {f.displayName}
                              </span>
                              <span className="text-[#b3b3b3] text-[13px] truncate leading-tight mt-0.5">
                                {f.presence.line}
                              </span>
                            </div>
                          </div>

                          <span className="font-mono text-[14px] font-bold text-white shrink-0 pl-1">
                            {f.presence.right}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Bottom Card: Your Username */}
            {myUsername && (
              <div className="mt-8 bg-[#0c0c0e] border border-white/10 rounded-3xl p-4 flex items-center justify-between shadow-2xl">
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-bold tracking-widest text-white/40 uppercase">
                    {t('yourUsername')}
                  </span>
                  <span className="text-base font-black font-mono text-white truncate mt-0.5">
                    @{myUsername}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyUsername}
                    className="px-3.5 py-2 rounded-full border border-white/20 text-white font-bold text-xs hover:bg-white/10 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                    <span>{t('copy')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="px-3.5 py-2 rounded-full bg-white text-black font-bold text-xs hover:bg-white/90 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Share2 size={12} />
                    <span>{t('share')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 2: ADD FRIEND SCREEN                                 */}
        {/* ========================================================= */}
        {view === 'add' && (
          <div className="flex-1 flex flex-col justify-between animate-in fade-in slide-in-from-right-4 duration-200">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {t('addFriendTitle')}
                </h2>
                <button
                  type="button"
                  onClick={() => setView('main')}
                  className="text-sm font-bold text-white/60 hover:text-white transition-colors cursor-pointer"
                >
                  {t('cancel')}
                </button>
              </div>

              {/* Exact-match Search Input */}
              <div className="relative flex items-center mb-6">
                <span className="absolute left-4 text-white/30 font-mono text-base font-bold pointer-events-none select-none">
                  @
                </span>
                <input
                  type="text"
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="username"
                  className="w-full bg-[#0c0c0e] border border-white/15 focus:border-white/40 pl-9 pr-10 py-3.5 rounded-2xl text-white text-base font-mono font-bold outline-none transition-all placeholder:text-white/20"
                />
                {searching ? (
                  <div className="absolute right-4 text-white/40">
                    <Loader2 size={16} className="animate-spin" />
                  </div>
                ) : searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/40 hover:text-white cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                ) : null}
              </div>

              {/* Result States */}
              {searchPerformed && !searching && (
                <div className="flex flex-col gap-4">
                  {searchResult?.user ? (
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-bold tracking-widest text-white/40 uppercase px-1">
                        RESULT
                      </span>
                      <div className="bg-white text-black rounded-3xl p-4 flex items-center justify-between shadow-2xl">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-full bg-black text-white flex items-center justify-center font-bold text-base uppercase shrink-0">
                            {searchResult.user.name?.[0] || searchResult.user.username?.[0] || 'U'}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-black text-base truncate leading-tight">
                              {searchResult.user.name || searchResult.user.username}
                            </span>
                            <span className="text-black/50 text-xs font-mono truncate leading-tight mt-0.5">
                              @{searchResult.user.username}
                            </span>
                          </div>
                        </div>

                        {/* Status Button */}
                        <div className="shrink-0">
                          {searchResult.relation === 'friends' ? (
                            <span className="px-4 py-2 rounded-full bg-black/10 text-black/70 font-bold text-xs select-none">
                              {t('alreadyFriends')}
                            </span>
                          ) : searchResult.relation === 'pending_sent' ? (
                            <span className="px-4 py-2 rounded-full bg-black/10 text-black/40 font-bold text-xs select-none">
                              {t('requested')}
                            </span>
                          ) : searchResult.relation === 'pending_received' ? (
                            <button
                              type="button"
                              onClick={() => handleRespond(searchResult.friendshipId, 'accept')}
                              className="px-4 py-2 rounded-full bg-black text-white font-bold text-xs hover:bg-black/90 active:scale-95 transition-all cursor-pointer"
                            >
                              {t('accept')}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={requestSending}
                              onClick={() => handleSendRequest(searchResult.user.username)}
                              className="px-5 py-2 rounded-full bg-black text-white font-bold text-xs hover:bg-black/90 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                            >
                              {requestSending ? 'Sending...' : t('add')}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* NOT FOUND STATE */
                    <div className="bg-[#0c0c0e] border border-white/10 rounded-2xl p-4 text-white/50 text-xs sm:text-sm text-center leading-relaxed">
                      {searchError || t('userNotFound')}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Card: Your Username */}
            {myUsername && (
              <div className="bg-[#0c0c0e] border border-white/10 rounded-3xl p-4 flex items-center justify-between shadow-2xl mt-8">
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-bold tracking-widest text-white/40 uppercase">
                    {t('yourUsername')}
                  </span>
                  <span className="text-base font-black font-mono text-white truncate mt-0.5">
                    @{myUsername}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyUsername}
                    className="px-3.5 py-2 rounded-full border border-white/20 text-white font-bold text-xs hover:bg-white/10 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                    <span>{t('copy')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="px-3.5 py-2 rounded-full bg-white text-black font-bold text-xs hover:bg-white/90 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Share2 size={12} />
                    <span>{t('share')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 3: PRIVACY SCREEN                                    */}
        {/* ========================================================= */}
        {view === 'privacy' && (
          <div className="flex-1 flex flex-col justify-between animate-in fade-in slide-in-from-right-4 duration-200">
            <div className="flex flex-col gap-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {t('privacy')}
                </h2>
                <button
                  type="button"
                  onClick={() => setView('main')}
                  className="text-sm font-bold text-white/60 hover:text-white transition-colors cursor-pointer"
                >
                  {t('done')}
                </button>
              </div>

              {/* Ghost Mode Card */}
              <div className="bg-white text-black rounded-3xl p-4 flex items-center justify-between shadow-2xl">
                <div className="flex flex-col pr-4">
                  <span className="text-base font-bold text-black leading-tight">
                    {t('ghostMode')}
                  </span>
                  <span className="text-xs text-black/50 leading-relaxed mt-1">
                    {t('ghostModeDesc')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !ghostMode;
                    setGhostMode(next);
                    savePrivacy(next, privacySettings);
                  }}
                  className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 cursor-pointer shrink-0 ${
                    ghostMode ? 'bg-black' : 'bg-black/20'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                      ghostMode ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Share with Friends Card */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold tracking-widest text-white/40 uppercase px-1">
                  {t('shareWithFriends')}
                </span>
                <div className="bg-white text-black rounded-3xl p-4 divide-y divide-black/10 shadow-2xl flex flex-col">
                  {[
                    { key: 'focusSessions', label: t('focusSessions'), desc: t('focusSessionsDesc') },
                    { key: 'focusFlights', label: t('focusFlights'), desc: t('focusFlightsDesc') },
                    { key: 'scheduledHabits', label: t('scheduledHabits'), desc: t('scheduledHabitsDesc') },
                    { key: 'spotify', label: t('spotify'), desc: t('spotifyDesc') },
                    { key: 'habits', label: t('habits'), desc: t('habitsDesc') },
                  ].map((item) => {
                    const active = privacySettings[item.key];
                    return (
                      <div key={item.key} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between">
                        <div className="flex flex-col pr-4">
                          <span className="text-sm font-bold text-black leading-tight">
                            {item.label}
                          </span>
                          <span className="text-[11px] text-black/50 leading-tight mt-0.5">
                            {item.desc}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const next = { ...privacySettings, [item.key]: !active };
                            if (item.key === 'scheduledHabits') next.lectures = next.scheduledHabits;
                            setPrivacySettings(next);
                            savePrivacy(ghostMode, next);
                          }}
                          className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 cursor-pointer shrink-0 ${
                            active ? 'bg-black' : 'bg-black/20'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                              active ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <span className="text-[11px] text-white/40 px-1 mt-1">
                  {t('privacyNote')}
                </span>
              </div>

              {/* Blocked List Section */}
              {blocked.length > 0 && (
                <div className="flex flex-col gap-2 mt-2">
                  <span className="text-[10px] font-bold tracking-widest text-white/40 uppercase px-1">
                    {t('blocked')} · {blocked.length}
                  </span>
                  {blocked.map((item) => (
                    <div
                      key={item.friendshipId}
                      className="bg-[#0c0c0e] border border-white/10 rounded-2xl p-3.5 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center font-bold text-sm uppercase shrink-0">
                          {item.user?.name?.[0] || item.user?.username?.[0] || 'U'}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-white text-sm truncate leading-tight">
                            {item.user?.name || item.user?.username}
                          </span>
                          <span className="text-white/40 text-xs font-mono truncate leading-tight mt-0.5">
                            @{item.user?.username}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveOrBlock(item.friendshipId, 'unblock')}
                        className="px-4 py-1.5 rounded-full border border-white/20 text-white font-bold text-xs hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                      >
                        {t('unblock')}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ========================================================= */}
      {/* RICH BOTTOM SHEET: FRIEND PRESENCE & ACTIVITY WIDGET     */}
      {/* ========================================================= */}
      {selectedFriend && (
        <div className="fixed inset-0 z-[10030] flex flex-col justify-end">
          {/* Backdrop */}
          <div
            onClick={() => {
              setSelectedFriend(null);
              setShowManageSheet(false);
            }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          />

          {/* Sliding White Presence Sheet */}
          <div 
            className="relative z-10 w-full max-w-md mx-auto bg-white text-[#0a0a0a] rounded-t-[32px] p-5 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] flex flex-col gap-4 shadow-2xl animate-in slide-in-from-bottom duration-200 max-h-[90vh] overflow-y-auto overscroll-y-contain"
            style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
          >
            
            {/* Top Handle */}
            <div className="w-[44px] h-[5px] rounded-[3px] bg-[#d4d4d4] self-center mb-1" />

            {/* Friend Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-full bg-[#0a0a0a] text-white flex items-center justify-center font-bold text-[20px] uppercase shrink-0">
                  {selectedFriend.initial}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[20px] font-bold tracking-tight text-[#0a0a0a] truncate leading-tight">
                    {selectedFriend.displayName}
                  </span>
                  <span className="text-[13px] text-[#525252] truncate leading-tight mt-0.5">
                    {selectedFriend.presence.status}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* Manage trigger (remove / block) */}
                <button
                  type="button"
                  onClick={() => setShowManageSheet(!showManageSheet)}
                  className="w-9 h-9 rounded-full bg-[#f0f0f0] hover:bg-[#e4e4e7] flex items-center justify-center text-[#0a0a0a] active:scale-90 transition-all cursor-pointer"
                  title="Options"
                >
                  <MoreHorizontal size={18} />
                </button>
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFriend(null);
                    setShowManageSheet(false);
                  }}
                  className="w-9 h-9 rounded-full bg-[#f0f0f0] hover:bg-[#e4e4e7] flex items-center justify-center text-[#0a0a0a] active:scale-90 transition-all cursor-pointer font-bold"
                  aria-label="Close"
                >
                  <X size={16} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Management Tray (Revealed on click of ...) */}
            {showManageSheet && (
              <div className="bg-[#f7f7f8] rounded-2xl p-4 flex flex-col gap-3 border border-black/5 animate-in fade-in zoom-in-95 duration-150">
                <span className="text-[10px] font-bold tracking-widest text-[#525252] uppercase">
                  MANAGE FRIENDSHIP
                </span>
                <div className="flex flex-col divide-y divide-black/10">
                  <button
                    type="button"
                    onClick={() => handleRemoveOrBlock(selectedFriend.friendshipId, 'remove')}
                    className="py-2.5 text-start flex items-center justify-between text-black hover:text-black/70 cursor-pointer"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">{t('removeFriend')}</span>
                      <span className="text-[11px] text-[#71717a]">{t('removeFriendDesc')}</span>
                    </div>
                    <Trash2 size={16} className="text-[#71717a] shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemoveOrBlock(selectedFriend.friendshipId, 'block')}
                    className="py-2.5 text-start flex items-center justify-between text-red-600 hover:text-red-700 cursor-pointer"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">{t('block')}</span>
                      <span className="text-[11px] text-[#71717a]">{t('blockDesc')}</span>
                    </div>
                    <ShieldAlert size={16} className="text-red-500 shrink-0" />
                  </button>
                </div>
              </div>
            )}

            {/* Activity Card */}
            <div className="bg-[#f5f5f5] rounded-[24px] p-5 flex flex-col gap-2.5">
              <span className="font-mono text-[11px] font-bold tracking-[2px] text-[#525252] uppercase">
                {selectedFriend.presence.label}
              </span>

              {/* Big Title */}
              <span 
                className="font-black tracking-tight text-[#0a0a0a] leading-none select-text"
                style={{ fontSize: `${selectedFriend.presence.bigSize}px` }}
              >
                {selectedFriend.presence.big}
              </span>

              <span className="text-[14px] text-[#525252]">
                {selectedFriend.presence.sub}
              </span>

              {/* Progress Bar (if hasBar) */}
              {selectedFriend.presence.hasBar && (
                <div className="flex flex-col gap-2 pt-1">
                  <div className="h-2 rounded-[4px] bg-[#d4d4d4] overflow-hidden">
                    <div 
                      className="h-full rounded-[4px] bg-[#0a0a0a] transition-all duration-500" 
                      style={{ width: `${selectedFriend.presence.pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between font-mono text-[12px] font-bold text-[#404040]">
                    <span>{selectedFriend.presence.barL}</span>
                    <span>{selectedFriend.presence.barR}</span>
                  </div>
                </div>
              )}

              {/* Chips (e.g. Lecture) */}
              {selectedFriend.presence.hasChips && (
                <div className="flex gap-2 flex-wrap pt-1">
                  {selectedFriend.presence.chips.map((chip, idx) => (
                    <span 
                      key={idx}
                      className="font-mono text-[12px] font-bold bg-white text-[#0a0a0a] rounded-[10px] px-2.5 py-1.5 shadow-sm"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              )}

              {/* Dots Indicator (e.g. Cycles or Habits) */}
              {selectedFriend.presence.hasDots && (
                <div className="flex gap-2 pt-1">
                  {selectedFriend.presence.dots.map((dot, idx) => (
                    <span 
                      key={idx}
                      className="w-3 h-3 rounded-full transition-colors"
                      style={{ backgroundColor: dot ? '#0a0a0a' : '#c4c4c4' }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Secondary Section (e.g. Spotify Track card) */}
            {selectedFriend.presence.hasSec && (
              <div className="flex items-center gap-3 border-2 border-[#e5e5e5] rounded-[20px] p-2.5 px-3">
                <div className="w-11 h-11 rounded-[10px] bg-[#0a0a0a] text-white flex items-center justify-center shrink-0">
                  <Music size={18} />
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <span className="text-[14px] font-bold text-[#0a0a0a] truncate leading-tight">
                    {selectedFriend.presence.secTitle}
                  </span>
                  <span className="text-[12px] text-[#525252] truncate leading-tight">
                    {selectedFriend.presence.secSub}
                  </span>
                  <div className="h-1 rounded-full bg-[#d4d4d4] overflow-hidden mt-0.5">
                    <div 
                      className="h-full rounded-full bg-[#0a0a0a]"
                      style={{ width: `${selectedFriend.presence.secPct}%` }}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => showToast(`Listening along to ${selectedFriend.presence.secTitle}...`)}
                  className="h-9 px-3.5 rounded-full bg-[#f0f0f0] hover:bg-[#e4e4e7] font-bold text-[13px] text-[#0a0a0a] transition-all cursor-pointer active:scale-95 shrink-0"
                >
                  Listen along
                </button>
              </div>
            )}

            {/* Main Action Buttons */}
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  const targetUser = selectedFriend.user?.username;
                  if (targetUser) {
                    apiFetch('/api/friends/nudge', {
                      method: 'POST',
                      body: JSON.stringify({ 
                        username: targetUser, 
                        type: selectedFriend.presence.kind === 'habit' ? 'cheer' : 'study' 
                      })
                    }).catch(() => {});
                  }
                  showToast(`${selectedFriend.presence.action} with ${selectedFriend.displayName}!`);
                }}
                className="flex-1 h-[54px] rounded-full bg-[#0a0a0a] text-white font-bold text-[16px] flex items-center justify-center active:scale-[0.98] hover:bg-black/90 transition-all cursor-pointer shadow-lg"
              >
                {selectedFriend.presence.action}
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetUser = selectedFriend.user?.username;
                  if (targetUser) {
                    apiFetch('/api/friends/nudge', {
                      method: 'POST',
                      body: JSON.stringify({ username: targetUser, type: 'nudge' })
                    }).catch(() => {});
                  }
                  showToast(`Nudge sent to ${selectedFriend.displayName}!`);
                }}
                className="w-[110px] h-[54px] rounded-full border-2 border-[#0a0a0a] text-[#0a0a0a] font-bold text-[16px] flex items-center justify-center active:scale-[0.98] hover:bg-black/5 transition-all cursor-pointer"
              >
                Nudge
              </button>
            </div>

            {/* Together this week footer */}
            <span className="text-[13px] text-[#525252] text-center select-none pt-0.5">
              Together this week: {selectedFriend.presence.together}
            </span>

          </div>
        </div>
      )}
    </div>
  );
}
