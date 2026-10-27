"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Users, Plus, X, Search, Check, Copy, Share2, 
  Shield, AlertCircle, Loader2, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { translations } from '@/lib/translations';

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
  const t = (k) => translations[lang]?.[k] || translations.en[k] || k;

  // Views: 'main' | 'add' | 'privacy'
  const [view, setView] = useState('main');
  
  // Data State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [blocked, setBlocked] = useState([]);

  // Selected friend for bottom sheet
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Search state in Add Friend view
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null); // { user, relation, friendshipId }
  const [searchError, setSearchError] = useState(null);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [requestSending, setRequestSending] = useState(false);

  // In-list filter state
  const [listFilter, setListFilter] = useState('');

  // Privacy switches state (UI-only for now)
  const [ghostMode, setGhostMode] = useState(false);
  const [privacySettings, setPrivacySettings] = useState({
    focusSessions: true,
    focusFlights: true,
    lectures: true,
    spotify: false,
    habits: true,
  });

  // Copied username indicator
  const [copied, setCopied] = useState(false);

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
      setSearchQuery('');
      setSearchResult(null);
      setSearchPerformed(false);
    }
  }, [isOpen, loadFriends]);

  // Debounced search effect
  useEffect(() => {
    if (view !== 'add') return;
    const clean = searchQuery.trim().toLowerCase().replace(/^@/, '');
    if (clean.length < 4) {
      setSearchResult(null);
      setSearchPerformed(false);
      setSearchError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const res = await apiFetch(`/api/friends/search?username=${encodeURIComponent(clean)}`);
        if (res.status === 429) {
          setSearchError(t('tooManyRequests'));
          setSearchResult(null);
          setSearchPerformed(true);
          return;
        }
        if (!res.ok) {
          throw new Error('Search failed');
        }
        const data = await res.json();
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
  }, [searchQuery, view, t]);

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

  // Filtered friends list
  const cleanFilter = listFilter.trim().toLowerCase().replace(/^@/, '');
  const filteredFriends = friends.filter((f) => {
    if (!cleanFilter) return true;
    const u = (f.user?.username || '').toLowerCase();
    const n = (f.user?.name || '').toLowerCase();
    return u.includes(cleanFilter) || n.includes(cleanFilter);
  });

  const isEmpty = friends.length === 0 && incoming.length === 0;

  return (
    <div 
      dir={isRtl ? 'rtl' : 'ltr'} 
      className="fixed inset-0 z-[10005] bg-black overflow-y-auto select-none font-sans flex flex-col items-center animate-in fade-in duration-200"
    >
      {/* Toast banner */}
      {toastMessage && (
        <div className="fixed top-6 z-[10020] bg-white text-black px-4 py-2 rounded-full font-bold text-xs shadow-2xl animate-in fade-in slide-in-from-top-4 duration-150">
          {toastMessage}
        </div>
      )}

      {/* Main Container */}
      <div className="w-full max-w-md min-h-screen px-5 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] pb-[calc(env(safe-area-inset-bottom,0px)+3rem)] flex flex-col justify-between relative">
        
        {/* ========================================================= */}
        {/* VIEW 1: MAIN FRIENDS LIST & EMPTY STATE                   */}
        {/* ========================================================= */}
        {view === 'main' && (
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0"
                  aria-label="Back"
                >
                  <ChevronLeft size={20} className={isRtl ? 'rotate-180' : ''} />
                </button>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                  {t('friendsTitle')}
                </h1>
              </div>

              <div className="flex items-center gap-2">
                {/* Privacy Screen Toggle */}
                <button
                  type="button"
                  onClick={() => setView('privacy')}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                  title={t('privacy')}
                  aria-label={t('privacy')}
                >
                  <Shield size={18} />
                </button>

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

            {/* In-list Search Filter (Only shown when friends exist) */}
            {!isEmpty && (
              <div className="relative flex items-center mb-6">
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
              <div className="flex-1 flex flex-col gap-6">
                {/* Requests Section */}
                {incoming.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <span className="text-[11px] font-bold tracking-widest text-white/40 uppercase px-1">
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
                <div className="flex flex-col gap-3">
                  <span className="text-[11px] font-bold tracking-widest text-white/40 uppercase px-1">
                    {t('friendsTitle')} · {filteredFriends.length}
                  </span>

                  {filteredFriends.length === 0 ? (
                    <div className="py-12 text-center text-white/30 text-xs">
                      No friends found matching &ldquo;{listFilter}&rdquo;
                    </div>
                  ) : (
                    filteredFriends.map((item) => {
                      const friendName = item.user?.name || item.user?.username || 'Friend';
                      const initial = friendName[0]?.toUpperCase() || 'F';
                      return (
                        <div
                          key={item.friendshipId}
                          onClick={() => setSelectedFriend(item)}
                          className="bg-[#0c0c0e] hover:bg-white/[0.04] border border-white/10 rounded-2xl p-3.5 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Avatar with Ring */}
                            <div className="w-11 h-11 rounded-full p-[2px] bg-white/20 shrink-0 flex items-center justify-center">
                              <div className="w-full h-full rounded-full bg-[#1c1c1e] text-white flex items-center justify-center font-bold text-sm uppercase">
                                {initial}
                              </div>
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-white text-[15px] truncate leading-tight">
                                {friendName}
                              </span>
                              <span className="text-white/40 text-xs font-mono truncate leading-tight mt-0.5">
                                @{item.user?.username}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-white/40">
                              Connected
                            </span>
                            <ChevronRight size={14} className="text-white/30" />
                          </div>
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
                  onClick={() => setGhostMode(!ghostMode)}
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
                    { key: 'lectures', label: t('lectures'), desc: t('lecturesDesc') },
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
                          onClick={() => setPrivacySettings({ ...privacySettings, [item.key]: !active })}
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
      {/* BOTTOM SHEET: FRIEND OPTIONS SHEET (TAP ANY FRIEND)       */}
      {/* ========================================================= */}
      {selectedFriend && (
        <div className="fixed inset-0 z-[10030] flex flex-col justify-end">
          {/* Backdrop */}
          <div
            onClick={() => setSelectedFriend(null)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          />

          {/* Sliding Sheet */}
          <div className="relative z-10 w-full max-w-md mx-auto bg-white text-black rounded-t-[32px] p-6 pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] flex flex-col gap-5 shadow-2xl animate-in slide-in-from-bottom duration-200">
            {/* Drag Handle */}
            <div className="w-11 h-1.5 rounded-full bg-black/20 self-center mb-1" />

            {/* Friend Header */}
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center font-bold text-lg uppercase shrink-0">
                {selectedFriend.user?.name?.[0] || selectedFriend.user?.username?.[0] || 'F'}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xl font-black text-black tracking-tight truncate leading-tight">
                  {selectedFriend.user?.name || selectedFriend.user?.username}
                </span>
                <span className="text-xs text-black/50 font-mono truncate leading-tight mt-0.5">
                  @{selectedFriend.user?.username}
                </span>
              </div>
            </div>

            {/* Nudge Once a Day */}
            <div className="flex flex-col gap-2 pt-2">
              <span className="text-[10px] font-bold tracking-widest text-black/40 uppercase">
                {t('nudgeOnceADay')}
              </span>
              <div className="flex gap-2 flex-wrap">
                {[
                  t('nudgeStudy'),
                  t('nudgeJoining'),
                  t('nudgeGoodLuck'),
                ].map((nudge, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      showToast(`Nudge "${nudge}" sent!`);
                    }}
                    className="px-4 py-2 rounded-full bg-[#f0f0f2] hover:bg-[#e4e4e7] active:scale-95 text-black font-bold text-xs transition-all cursor-pointer"
                  >
                    {nudge}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[1px] bg-black/10 my-1" />

            {/* Remove Friend Action */}
            <button
              type="button"
              onClick={() => handleRemoveOrBlock(selectedFriend.friendshipId, 'remove')}
              className="text-start flex flex-col gap-0.5 cursor-pointer group"
            >
              <span className="text-base font-bold text-black group-hover:text-black/70 transition-colors">
                {t('removeFriend')}
              </span>
              <span className="text-xs text-black/50 leading-relaxed">
                {t('removeFriendDesc')}
              </span>
            </button>

            <div className="h-[1px] bg-black/10 my-1" />

            {/* Block Action */}
            <button
              type="button"
              onClick={() => handleRemoveOrBlock(selectedFriend.friendshipId, 'block')}
              className="text-start flex flex-col gap-0.5 cursor-pointer group"
            >
              <span className="text-base font-bold text-red-600 group-hover:text-red-500 transition-colors">
                {t('block')}
              </span>
              <span className="text-xs text-black/50 leading-relaxed">
                {t('blockDesc')}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
