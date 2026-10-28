"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Users, Plus, X, Search, Check, Copy, Share2, 
  Shield, AlertCircle, Loader2, ChevronLeft, ChevronRight,
  Music, Plane, Clock, Sparkles, MoreHorizontal, ShieldAlert, Trash2, Lock,
  Pin
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { translations } from '@/lib/translations';
import AvatarIcon from '@/components/AvatarIcon';
import { PRESENCE_PRESETS, DEMO_FRIENDS, getSafeTrackArt } from '@/lib/friendsPresets';

export default function FriendsModal({ 
  isOpen, 
  onClose, 
  initialSelectedFriend = null,
  myUsername = '', 
  myName = '',
  myAvatar = 'boy1',
  lang = 'en', 
  themeColor = '#FF9F0A',
  pinnedFriendUsername: propPinnedUsername,
  onTogglePinFriend,
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

  // Pinned Friend State (synced with localStorage & window event)
  const [pinnedFriendUsername, setPinnedFriendUsername] = useState(() => {
    if (propPinnedUsername !== undefined) return propPinnedUsername;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('daybase_pinned_friend_username') || '';
    }
    return '';
  });

  useEffect(() => {
    if (propPinnedUsername !== undefined) {
      setPinnedFriendUsername(propPinnedUsername);
    }
  }, [propPinnedUsername]);

  const handleTogglePin = (targetUsername, targetName) => {
    if (!targetUsername) return;
    const isCurrentlyPinned = (pinnedFriendUsername || '').toLowerCase() === targetUsername.toLowerCase();
    const nextPinned = isCurrentlyPinned ? '' : targetUsername;
    setPinnedFriendUsername(nextPinned);
    if (typeof window !== 'undefined') {
      if (nextPinned) {
        localStorage.setItem('daybase_pinned_friend_username', nextPinned);
      } else {
        localStorage.removeItem('daybase_pinned_friend_username');
      }
      window.dispatchEvent(new CustomEvent('daybase_pinned_friend_changed', { detail: nextPinned }));
    }
    if (onTogglePinFriend) {
      onTogglePinFriend(targetUsername);
    }
    if (isCurrentlyPinned) {
      showToast('Unpinned. Home widget will show active friends.');
    } else {
      showToast(`Pinned ${targetName || targetUsername} to home screen`);
    }
  };

  // Selected friend for presence bottom sheet
  const [selectedFriend, setSelectedFriend] = useState(initialSelectedFriend);
  const [showManageSheet, setShowManageSheet] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Search state in Add Friend view
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState(null);
  const [searchPerformed, setSearchPerformed] = useState(false);

  // Refs to prevent duplicate fetches, infinite loops, and flickering across re-renders
  const lastQueryRef = useRef('');
  const searchCacheRef = useRef({});
  const [requestSending, setRequestSending] = useState(false);

  // In-list filter state
  const [listFilter, setListFilter] = useState('');

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

  // Lock background body scroll while Friends modal is open
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
      setSelectedFriend(initialSelectedFriend || null);
      setShowManageSheet(false);
      setSearchQuery('');
      setSearchResult(null);
      setSearchPerformed(false);
    }
  }, [isOpen, initialSelectedFriend, loadFriends]);

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

    if (clean === lastQueryRef.current) {
      return;
    }

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
    const updated = friendsWithPresence.find((f) => 
      (f.friendshipId && f.friendshipId === selectedFriend.friendshipId) ||
      ((f.user?.username || f.displayName) === (selectedFriend.user?.username || selectedFriend.displayName))
    );
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

  // Count active friends
  const activeFriendsCount = useMemo(() => {
    return friendsWithPresence.filter((f) => f.presence.kind === 'focus' || f.presence.kind === 'flight' || f.presence.kind === 'music' || f.presence.kind === 'lecture').length;
  }, [friendsWithPresence]);

  // Close handler for presence bottom sheet
  const handleCloseSelectedSheet = () => {
    setSelectedFriend(null);
    setShowManageSheet(false);
    if (initialSelectedFriend) {
      onClose();
    }
  };

  // Action: Accept / Decline Request (Optimistic)
  const handleRespond = async (friendshipId, action) => {
    const prevIncoming = [...incoming];
    const prevFriends = [...friends];

    const targetItem = incoming.find((i) => i.friendshipId === friendshipId);
    if (!targetItem) return;

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

    if (action === 'remove' || action === 'block') {
      const target = friends.find((f) => f.friendshipId === friendshipId);
      setFriends((prev) => prev.filter((f) => f.friendshipId !== friendshipId));
      if (action === 'block' && target) {
        setBlocked((prev) => [target, ...prev]);
      }
      setSelectedFriend(null);
      setShowManageSheet(false);
      if (initialSelectedFriend) {
        onClose();
      }
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
      return { border: '1.5px solid rgba(255, 255, 255, 0.12)' };
    }
    if (kind === 'lecture' || kind === 'habit') {
      return { border: '2px solid rgba(255, 255, 255, 0.9)' };
    }
    return {
      background: `conic-gradient(#ffffff 0 ${pct}%, rgba(255, 255, 255, 0.15) 0)`,
      padding: '2px',
    };
  };

  // Reusable Friend Presence Bottom Sheet Component
  const renderPresenceSheet = () => {
    if (!selectedFriend) return null;

    const isCurrentFriendPinned = (pinnedFriendUsername || '').toLowerCase() === (selectedFriend.user?.username || selectedFriend.displayName || '').toLowerCase();

    return (
      <div 
        className="relative z-10 w-full max-w-md mx-auto liquid-panel bg-[#0d0d10]/95 border-t border-x border-white/15 rounded-t-[28px] p-5 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] flex flex-col gap-4 shadow-2xl backdrop-blur-2xl animate-in slide-in-from-bottom duration-200 max-h-[90vh] overflow-y-auto overscroll-y-contain"
        style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
      >
        {/* Top Handle */}
        <div className="w-11 h-1 rounded-full bg-white/20 self-center mb-1 shrink-0" />

        {/* Friend Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-[16px] bg-white/[0.08] border border-white/15 text-white flex items-center justify-center font-bold text-lg uppercase shrink-0 shadow-inner">
              <AvatarIcon name={selectedFriend.user?.avatar || 'user'} size={24} className="text-white" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[19px] font-bold tracking-tight text-white truncate leading-tight">
                {selectedFriend.displayName}
              </span>
              <span className="text-[13px] text-white/50 truncate leading-tight mt-0.5">
                {selectedFriend.presence.status}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Pin / Unpin Button */}
            <button
              type="button"
              onClick={() => handleTogglePin(selectedFriend.user?.username, selectedFriend.displayName)}
              className={`h-9 px-3 rounded-[12px] flex items-center gap-1.5 font-bold text-xs transition-all cursor-pointer active:scale-95 ${
                isCurrentFriendPinned
                  ? 'bg-white text-black shadow-md'
                  : 'bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white'
              }`}
              title={isCurrentFriendPinned ? 'Unpin from Home' : 'Pin to Home'}
            >
              <Pin size={13} className={isCurrentFriendPinned ? 'fill-current' : ''} />
              <span>
                {isCurrentFriendPinned ? 'Pinned' : 'Pin'}
              </span>
            </button>

            {/* Manage trigger (remove / block) */}
            <button
              type="button"
              onClick={() => setShowManageSheet(!showManageSheet)}
              className="w-9 h-9 rounded-[12px] bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center text-white active:scale-90 transition-all cursor-pointer"
              title="Options"
            >
              <MoreHorizontal size={18} />
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={handleCloseSelectedSheet}
              className="w-9 h-9 rounded-[12px] bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center text-white active:scale-90 transition-all cursor-pointer font-bold"
              aria-label="Close"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Management Tray (Revealed on click of ...) */}
        {showManageSheet && (
          <div className="bg-white/[0.04] rounded-[18px] p-4 flex flex-col gap-3 border border-white/10 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
            <span className="text-[10px] font-mono font-bold tracking-widest text-white/40 uppercase">
              MANAGE FRIENDSHIP
            </span>
            <div className="flex flex-col divide-y divide-white/10">
              <button
                type="button"
                onClick={() => {
                  handleTogglePin(selectedFriend.user?.username, selectedFriend.displayName);
                  setShowManageSheet(false);
                }}
                className="py-2.5 text-start flex items-center justify-between text-white hover:text-white/80 cursor-pointer"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-bold">
                    {isCurrentFriendPinned ? 'Unpin from Home' : 'Pin to Home Screen'}
                  </span>
                  <span className="text-[11px] text-white/40">
                    {isCurrentFriendPinned
                      ? 'Home widget will switch to auto-showing active friends'
                      : 'Keep this friend fixed on your home screen widget'}
                  </span>
                </div>
                <Pin size={16} className={`shrink-0 ${isCurrentFriendPinned ? 'text-white fill-current' : 'text-white/40'}`} />
              </button>

              <button
                type="button"
                onClick={() => handleRemoveOrBlock(selectedFriend.friendshipId, 'remove')}
                className="py-2.5 text-start flex items-center justify-between text-white/80 hover:text-white cursor-pointer"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-bold">{t('removeFriend')}</span>
                  <span className="text-[11px] text-white/40">{t('removeFriendDesc')}</span>
                </div>
                <Trash2 size={16} className="text-white/40 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => handleRemoveOrBlock(selectedFriend.friendshipId, 'block')}
                className="py-2.5 text-start flex items-center justify-between text-red-400 hover:text-red-300 cursor-pointer"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-bold">{t('block')}</span>
                  <span className="text-[11px] text-white/40">{t('blockDesc')}</span>
                </div>
                <ShieldAlert size={16} className="text-red-400 shrink-0" />
              </button>
            </div>
          </div>
        )}

        {/* Activity Card */}
        <div className="rounded-[20px] liquid-panel bg-white/[0.04] border border-white/10 p-5 flex flex-col gap-2.5 backdrop-blur-xl">
          <span className="font-mono text-[11px] font-bold tracking-[2px] text-white/40 uppercase">
            {selectedFriend.presence.label}
          </span>

          {/* Big Title */}
          <div className="flex items-center gap-3">
            {selectedFriend.presence.kind === 'music' && (selectedFriend.presence.art || selectedFriend.presence.secArt) && (
              <div className="w-14 h-14 rounded-[14px] overflow-hidden shadow-md shrink-0 border border-white/10">
                <img 
                  src={getSafeTrackArt(selectedFriend.presence.art || selectedFriend.presence.secArt)} 
                  alt={selectedFriend.presence.big || 'Album'} 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span 
                className="font-black tracking-tight text-white leading-none select-text truncate"
                style={{ fontSize: `${selectedFriend.presence.bigSize}px` }}
              >
                {selectedFriend.presence.big}
              </span>
              <span className="text-[13px] text-white/60 mt-1 truncate">
                {selectedFriend.presence.sub}
              </span>
            </div>
          </div>

          {/* Progress Bar (if hasBar) */}
          {selectedFriend.presence.hasBar && (
            <div className="flex flex-col gap-2 pt-1">
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-white transition-all duration-500" 
                  style={{ width: `${selectedFriend.presence.pct}%` }}
                />
              </div>
              <div className="flex justify-between font-mono text-[12px] font-bold text-white/50">
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
                  className="font-mono text-[12px] font-bold bg-white/[0.08] border border-white/10 text-white rounded-[10px] px-2.5 py-1.5 shadow-sm"
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
                  className="w-2.5 h-2.5 rounded-full transition-colors"
                  style={{ backgroundColor: dot ? '#ffffff' : 'rgba(255, 255, 255, 0.2)' }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Secondary Section (e.g. Spotify Track card) */}
        {selectedFriend.presence.hasSec && (
          <div className="flex items-center gap-3 border border-white/10 rounded-[18px] p-2.5 px-3 bg-white/[0.03] backdrop-blur-xl">
            <div className="w-11 h-11 rounded-[12px] bg-white/10 text-white flex items-center justify-center shrink-0 overflow-hidden relative border border-white/10">
              {selectedFriend.presence.secArt ? (
                <img 
                  src={getSafeTrackArt(selectedFriend.presence.secArt)} 
                  alt={selectedFriend.presence.secTitle || 'Spotify'} 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                <Music size={18} />
              )}
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <span className="text-[14px] font-bold text-white truncate leading-tight">
                {selectedFriend.presence.secTitle}
              </span>
              <span className="text-[12px] text-white/50 truncate leading-tight">
                {selectedFriend.presence.secSub}
              </span>
              <div className="h-1 rounded-full bg-white/10 overflow-hidden mt-0.5">
                <div 
                  className="h-full rounded-full bg-white"
                  style={{ width: `${selectedFriend.presence.secPct}%` }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => showToast(`Listening along to ${selectedFriend.presence.secTitle}...`)}
              className="h-8 px-3 rounded-[10px] bg-white text-black font-bold text-xs hover:bg-white/90 active:scale-95 transition-all cursor-pointer shrink-0 shadow-sm"
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
            className="flex-1 h-[50px] rounded-[16px] bg-white text-black font-bold text-[15px] flex items-center justify-center active:scale-[0.98] hover:bg-white/90 transition-all cursor-pointer shadow-lg"
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
            className="w-[100px] h-[50px] rounded-[16px] border border-white/20 bg-white/[0.05] hover:bg-white/10 text-white font-bold text-[15px] flex items-center justify-center active:scale-[0.98] transition-all cursor-pointer"
          >
            Nudge
          </button>
        </div>

        {/* Together this week footer */}
        <span className="text-[12px] text-white/40 text-center select-none pt-0.5 font-medium">
          Together this week: {selectedFriend.presence.together}
        </span>
      </div>
    );
  };

  // IF OPENED DIRECTLY FOR A SPECIFIC FRIEND'S STATUS (e.g. from the home screen widget):
  // Render ONLY the presence sheet and backdrop over the home screen (no full black canvas!)
  if (initialSelectedFriend && selectedFriend) {
    return (
      <div 
        dir={isRtl ? 'rtl' : 'ltr'} 
        className="fixed inset-0 z-[10030] flex flex-col justify-end font-sans select-none"
      >
        {/* Toast banner */}
        {toastMessage && (
          <div className="fixed top-6 z-[10040] left-1/2 -translate-x-1/2 bg-white text-black px-4 py-2 rounded-full font-bold text-xs shadow-2xl animate-in fade-in slide-in-from-top-4 duration-150">
            {toastMessage}
          </div>
        )}

        {/* Backdrop */}
        <div
          onClick={handleCloseSelectedSheet}
          className="fixed inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
        />

        {/* Presence Bottom Sheet */}
        {renderPresenceSheet()}
      </div>
    );
  }

  // OTHERWISE: FULL REDESIGNED FRIENDS MODAL
  return (
    <div 
      dir={isRtl ? 'rtl' : 'ltr'} 
      className="fixed inset-0 z-[10005] bg-[#09090b]/95 backdrop-blur-2xl overflow-y-auto overscroll-y-contain font-sans"
      style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
    >
      {/* Ambient top light */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[380px] h-[220px] bg-white/[0.03] blur-3xl pointer-events-none rounded-full" />

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
                  className="w-10 h-10 rounded-[14px] bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 backdrop-blur-md text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0"
                  aria-label="Back"
                >
                  <ChevronLeft size={20} className={isRtl ? 'rotate-180' : ''} />
                </button>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                    {t('friendsTitle')}
                  </h1>
                  {!isEmpty && (
                    <span className="text-[10px] font-mono font-bold tracking-wider text-white/60 bg-white/[0.06] border border-white/10 rounded-full px-2.5 py-0.5 uppercase shrink-0">
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
                  className="w-10 h-10 rounded-[14px] bg-white text-black flex items-center justify-center font-bold hover:bg-white/90 shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
                  title={t('addFriendTitle')}
                  aria-label={t('addFriendTitle')}
                >
                  <Plus size={20} strokeWidth={2.8} />
                </button>
              </div>
            </div>

            {/* Top Horizontal Presence Avatar Bar (Story Ring Bar) */}
            {!isEmpty && friendsWithPresence.length > 0 && (
              <div className="flex items-center gap-3.5 overflow-x-auto no-scrollbar py-2 mb-3 -mx-2 px-2">
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
                      className="flex flex-col items-center gap-1.5 shrink-0 w-[54px] cursor-pointer group active:scale-95 transition-transform"
                    >
                      <div 
                        className="relative w-[50px] h-[50px] rounded-full flex items-center justify-center shrink-0"
                        style={ring}
                      >
                        <div className="w-full h-full rounded-full bg-[#161619] border border-white/10 flex items-center justify-center text-white font-bold text-base shadow-inner">
                          <AvatarIcon name={f.user?.avatar || 'user'} size={22} className="text-white" />
                        </div>
                        {f.presence.hasMusicBadge && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-[17px] h-[17px] rounded-full bg-white border border-black flex items-center justify-center text-black shadow-md">
                            <Music size={9} strokeWidth={3} />
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-medium tracking-wide text-white/50 group-hover:text-white transition-colors truncate max-w-full text-center mt-0.5">
                        {f.presence.tag}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* In-list Search Filter */}
            {!isEmpty && (
              <div className="relative flex items-center mb-4">
                <span className="absolute left-3.5 text-white/30 font-mono text-xs font-bold pointer-events-none select-none">
                  @
                </span>
                <input
                  type="text"
                  value={listFilter}
                  onChange={(e) => setListFilter(e.target.value)}
                  placeholder={t('searchUsername')}
                  className="w-full bg-white/[0.03] hover:bg-white/[0.05] focus:bg-white/[0.07] border border-white/10 focus:border-white/25 pl-9 pr-9 py-2.5 rounded-[16px] text-white text-sm outline-none transition-all placeholder:text-white/30 font-medium backdrop-blur-xl"
                />
                {listFilter && (
                  <button
                    type="button"
                    onClick={() => setListFilter('')}
                    className="absolute right-3 w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/50 hover:text-white cursor-pointer transition-colors"
                  >
                    <X size={11} />
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
                <div className="relative w-44 h-44 rounded-full border border-white/10 flex items-center justify-center my-4 bg-white/[0.01]">
                  <div className="w-28 h-28 rounded-full border border-white/15 flex items-center justify-center bg-white/[0.02]">
                    <button
                      type="button"
                      onClick={() => setView('add')}
                      className="w-14 h-14 rounded-[18px] bg-white text-black flex items-center justify-center shadow-2xl active:scale-95 transition-transform cursor-pointer"
                    >
                      <Plus size={26} strokeWidth={2.8} />
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
                    className="w-full py-3.5 rounded-[16px] bg-white text-black font-bold text-sm shadow-xl hover:bg-white/90 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    {t('addByUsername')}
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="w-full py-3.5 rounded-[16px] border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] text-white font-bold text-sm active:scale-[0.98] transition-all cursor-pointer"
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
                    <span className="text-[11px] font-mono font-bold tracking-[2px] text-white/40 uppercase px-1">
                      {t('requests')} · {incoming.length}
                    </span>
                    {incoming.map((item) => (
                      <div 
                        key={item.friendshipId}
                        className="liquid-panel bg-white/[0.04] border border-white/15 rounded-[20px] p-3.5 flex items-center justify-between backdrop-blur-xl shadow-lg animate-in fade-in duration-150"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center shrink-0 border border-white/10">
                            <AvatarIcon name={item.user?.avatar || 'user'} size={22} className="text-white" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-white text-base truncate leading-tight">
                              {item.user?.name || item.user?.username}
                            </span>
                            <span className="text-white/40 text-xs font-mono truncate leading-tight mt-0.5">
                              @{item.user?.username}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleRespond(item.friendshipId, 'accept')}
                            className="bg-white text-black px-4 py-2 rounded-[12px] text-xs font-bold hover:bg-white/90 active:scale-95 transition-all cursor-pointer shadow-sm"
                          >
                            {t('accept')}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRespond(item.friendshipId, 'decline')}
                            className="w-8 h-8 rounded-[12px] border border-white/15 bg-white/[0.04] hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white active:scale-90 transition-all cursor-pointer"
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
                  <span className="text-[11px] font-mono font-bold tracking-[2px] text-white/40 uppercase px-1">
                    {t('friendsTitle')} · {filteredFriends.length}
                  </span>

                  {filteredFriends.length === 0 ? (
                    <div className="py-12 text-center text-white/30 text-xs font-medium">
                      No friends found matching &ldquo;{listFilter}&rdquo;
                    </div>
                  ) : (
                    filteredFriends.map((f) => {
                      const ring = getRingStyle(f.presence.kind, f.presence.pct);
                      const isPinned = pinnedFriendUsername && (pinnedFriendUsername.toLowerCase() === (f.user?.username || f.displayName || '').toLowerCase());
                      return (
                        <div
                          key={f.friendshipId}
                          onClick={() => {
                            setSelectedFriend(f);
                            setShowManageSheet(false);
                          }}
                          className="w-full px-4 py-3 rounded-[20px] liquid-panel bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-white/20 backdrop-blur-xl flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all duration-200 select-none shadow-sm min-h-[68px]"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* Avatar with Ring */}
                            <div 
                              className="relative w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                              style={ring}
                            >
                              <div className="w-[37px] h-[37px] rounded-full bg-[#18181b] border border-white/10 text-white flex items-center justify-center font-bold text-sm uppercase">
                                <AvatarIcon name={f.user?.avatar || 'user'} size={20} className="text-white" />
                              </div>
                              {f.presence.hasMusicBadge && (
                                <span className="absolute -bottom-0.5 -right-0.5 w-[16px] h-[16px] rounded-full bg-white text-black border border-black flex items-center justify-center shadow-sm">
                                  <Music size={8} strokeWidth={3} />
                                </span>
                              )}
                            </div>

                            <div className="flex flex-col min-w-0 flex-1 pr-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-bold text-white text-[15px] truncate leading-tight">
                                  {f.displayName}
                                </span>
                                {isPinned && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white text-black text-[8px] font-mono font-black uppercase tracking-wider shrink-0">
                                    <Pin size={7} className="fill-current" />
                                    PINNED
                                  </span>
                                )}
                              </div>
                              <span className="text-white/50 text-[12px] truncate leading-tight mt-0.5 font-medium">
                                {f.presence.line}
                              </span>
                            </div>
                          </div>

                          <span className="font-mono text-[11px] font-bold text-white/70 bg-white/[0.05] border border-white/10 px-2 py-1 rounded-[8px] shrink-0">
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
              <div className="mt-6 w-full liquid-panel bg-white/[0.03] border border-white/10 rounded-[20px] p-4 flex items-center justify-between shadow-xl backdrop-blur-xl">
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-mono font-bold tracking-widest text-white/40 uppercase">
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
                    className="px-3.5 py-2 rounded-[12px] border border-white/15 bg-white/[0.04] hover:bg-white/10 text-white font-bold text-xs active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                    <span>{t('copy')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="px-3.5 py-2 rounded-[12px] bg-white text-black font-bold text-xs hover:bg-white/90 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
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
                  className="text-sm font-semibold text-white/60 hover:text-white transition-colors cursor-pointer"
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
                  className="w-full liquid-panel bg-white/[0.03] border border-white/15 focus:border-white/35 pl-9 pr-10 py-3.5 rounded-[18px] text-white text-base font-mono font-bold outline-none transition-all placeholder:text-white/20 backdrop-blur-xl"
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
                      <span className="text-[10px] font-mono font-bold tracking-widest text-white/40 uppercase px-1">
                        RESULT
                      </span>
                      <div className="liquid-panel bg-white/[0.04] border border-white/15 rounded-[20px] p-4 flex items-center justify-between backdrop-blur-xl shadow-xl">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center shrink-0 border border-white/10">
                            <AvatarIcon name={searchResult.user.avatar || 'user'} size={22} className="text-white" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-white text-base truncate leading-tight">
                              {searchResult.user.name || searchResult.user.username}
                            </span>
                            <span className="text-white/40 text-xs font-mono truncate leading-tight mt-0.5">
                              @{searchResult.user.username}
                            </span>
                          </div>
                        </div>

                        {/* Status Button */}
                        <div className="shrink-0">
                          {searchResult.relation === 'friends' ? (
                            <span className="px-4 py-2 rounded-[12px] bg-white/10 text-white/70 font-bold text-xs select-none">
                              {t('alreadyFriends')}
                            </span>
                          ) : searchResult.relation === 'pending_sent' ? (
                            <span className="px-4 py-2 rounded-[12px] bg-white/10 text-white/40 font-bold text-xs select-none">
                              {t('requested')}
                            </span>
                          ) : searchResult.relation === 'pending_received' ? (
                            <button
                              type="button"
                              onClick={() => handleRespond(searchResult.friendshipId, 'accept')}
                              className="px-4 py-2 rounded-[12px] bg-white text-black font-bold text-xs hover:bg-white/90 active:scale-95 transition-all cursor-pointer shadow-sm"
                            >
                              {t('accept')}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={requestSending}
                              onClick={() => handleSendRequest(searchResult.user.username)}
                              className="px-5 py-2 rounded-[12px] bg-white text-black font-bold text-xs hover:bg-white/90 active:scale-95 transition-all cursor-pointer disabled:opacity-50 shadow-sm"
                            >
                              {requestSending ? 'Sending...' : t('add')}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* NOT FOUND STATE */
                    <div className="liquid-panel bg-white/[0.03] border border-white/10 rounded-[18px] p-4 text-white/50 text-xs sm:text-sm text-center leading-relaxed backdrop-blur-xl">
                      {searchError || t('userNotFound')}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Card: Your Username */}
            {myUsername && (
              <div className="liquid-panel bg-white/[0.03] border border-white/10 rounded-[20px] p-4 flex items-center justify-between shadow-xl mt-8 backdrop-blur-xl">
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-mono font-bold tracking-widest text-white/40 uppercase">
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
                    className="px-3.5 py-2 rounded-[12px] border border-white/15 bg-white/[0.04] hover:bg-white/10 text-white font-bold text-xs active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                    <span>{t('copy')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="px-3.5 py-2 rounded-[12px] bg-white text-black font-bold text-xs hover:bg-white/90 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
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
                  className="text-sm font-semibold text-white/60 hover:text-white transition-colors cursor-pointer"
                >
                  {t('done')}
                </button>
              </div>

              {/* Ghost Mode Card */}
              <div className="liquid-panel bg-white/[0.03] border border-white/10 rounded-[20px] p-4 flex items-center justify-between backdrop-blur-xl shadow-lg">
                <div className="flex flex-col pr-4">
                  <span className="text-base font-bold text-white leading-tight">
                    {t('ghostMode')}
                  </span>
                  <span className="text-xs text-white/50 leading-relaxed mt-1">
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
                    ghostMode ? 'bg-white' : 'bg-white/20'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full transition-transform duration-200 ${
                      ghostMode ? 'translate-x-5 bg-black' : 'translate-x-0 bg-white'
                    }`}
                  />
                </button>
              </div>

              {/* Share with Friends Card */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-mono font-bold tracking-widest text-white/40 uppercase px-1">
                  {t('shareWithFriends')}
                </span>
                <div className="liquid-panel bg-white/[0.03] border border-white/10 rounded-[20px] p-4 divide-y divide-white/10 backdrop-blur-xl shadow-lg flex flex-col">
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
                          <span className="text-sm font-bold text-white leading-tight">
                            {item.label}
                          </span>
                          <span className="text-[11px] text-white/50 leading-tight mt-0.5">
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
                            active ? 'bg-white' : 'bg-white/20'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full transition-transform duration-200 ${
                              active ? 'translate-x-5 bg-black' : 'translate-x-0 bg-white'
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <span className="text-[11px] text-white/40 px-1 mt-1 font-medium">
                  {t('privacyNote')}
                </span>
              </div>

              {/* Blocked List Section */}
              {blocked.length > 0 && (
                <div className="flex flex-col gap-2 mt-2">
                  <span className="text-[10px] font-mono font-bold tracking-widest text-white/40 uppercase px-1">
                    {t('blocked')} · {blocked.length}
                  </span>
                  {blocked.map((item) => (
                    <div
                      key={item.friendshipId}
                      className="liquid-panel bg-white/[0.03] border border-white/10 rounded-[18px] p-3.5 flex items-center justify-between backdrop-blur-xl"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center shrink-0 border border-white/10">
                          <AvatarIcon name={item.user?.avatar || 'user'} size={20} className="text-white" />
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
                        className="px-4 py-1.5 rounded-[12px] border border-white/20 bg-white/[0.05] hover:bg-white/10 text-white font-bold text-xs active:scale-95 transition-all cursor-pointer"
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
      {/* (Rendered when opened from inside the full friends list)   */}
      {/* ========================================================= */}
      {selectedFriend && (
        <div className="fixed inset-0 z-[10030] flex flex-col justify-end">
          {/* Backdrop */}
          <div
            onClick={handleCloseSelectedSheet}
            className="fixed inset-0 bg-black/70 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
          />

          {/* Sliding Liquid Dark Presence Sheet */}
          {renderPresenceSheet()}
        </div>
      )}
    </div>
  );
}
