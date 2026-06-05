"use client";
import { useState, useEffect } from 'react';
import { X, Users, UserPlus, Check, Trash2, Loader2, Trophy, Clock, Copy, Crown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FriendsPanel({ onClose, lang = 'en', themeColor = '#10B981', friendCode = '' }) {
  const [activeTab, setActiveTab] = useState('leaderboard'); // 'leaderboard' or 'add'
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [addCode, setAddCode] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addMessage, setAddMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const isRtl = lang === 'ar';
  const t = {
    friends: isRtl ? 'الأصدقاء' : 'Friends',
    leaderboard: isRtl ? 'المنافسة' : 'Leaderboard',
    addFriend: isRtl ? 'إضافة صديق' : 'Add Friend',
    myCode: isRtl ? 'كود الصداقة الخاص بك:' : 'Your Friend Code:',
    copy: isRtl ? 'نسخ' : 'Copy',
    copied: isRtl ? 'تم النسخ!' : 'Copied!',
    enterCode: isRtl ? 'أدخل كود الصديق...' : 'Enter Friend Code...',
    sendRequest: isRtl ? 'إرسال طلب' : 'Send Request',
    pendingRequests: isRtl ? 'طلبات معلقة' : 'Pending Requests',
    accept: isRtl ? 'قبول' : 'Accept',
    decline: isRtl ? 'رفض' : 'Decline',
    remove: isRtl ? 'إزالة' : 'Remove',
    focusTime: isRtl ? 'وقت التركيز' : 'Focus Time',
    habits: isRtl ? 'العادات المكتملة' : 'Habits Completed',
    noFriends: isRtl ? 'لا يوجد أصدقاء بعد. ابدأ بإضافة أصدقاء للتنافس!' : 'No friends yet. Add some to start competing!',
    min: isRtl ? 'د' : 'm',
    h: isRtl ? 'س' : 'h',
  };

  const fetchFriends = async () => {
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/friends?date=${dateStr}`);
      const data = await res.json();
      if (data.friends) {
        // Sort friends by focus time descending
        setFriends(data.friends.sort((a, b) => b.focusTime - a.focusTime));
        setRequests(data.requests);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, []);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(friendCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendRequest = async (e) => {
    e.preventDefault();
    if (!addCode.trim()) return;
    setAddLoading(true);
    setAddMessage('');
    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendCode: addCode.trim() })
      });
      const data = await res.json();
      if (data.success) {
        if (data.message === 'LONELY_ADD_SELF') {
          setAddMessage(lang === 'ar' ? 'انت وحيد لدرجة انك مش هتنافس حد ؟ مش مشكلة ،، خصمك دلوقتي هو نفسك' : "Are you so lonely you won't compete with anyone? No problem, your opponent is now yourself");
        } else {
          setAddMessage(lang === 'ar' ? 'تم إرسال الطلب بنجاح!' : 'Request sent successfully!');
        }
        setAddCode('');
        fetchFriends();
      } else {
        setAddMessage(data.error || 'Error sending request');
      }
    } catch (err) {
      setAddMessage('Error sending request');
    }
    setAddLoading(false);
  };

  const handleAccept = async (requestId) => {
    try {
      const res = await fetch('/api/friends/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId })
      });
      if (res.ok) fetchFriends();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeclineOrRemove = async (requestId, friendId) => {
    try {
      const body = requestId ? { requestId } : { friendId };
      const res = await fetch('/api/friends/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) fetchFriends();
    } catch (e) {
      console.error(e);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    if (m < 60) return `${m}${t.min}`;
    return `${Math.floor(m / 60)}${t.h} ${m % 60}${t.min}`;
  };

  const getScore = (f) => f.habitsTotal > 0 ? (f.habitsCompleted / f.habitsTotal) : 0;

  const sortedFriends = [...friends].sort((a, b) => {
    const scoreA = getScore(a);
    const scoreB = getScore(b);
    if (scoreB !== scoreA) return scoreB - scoreA;
    return b.focusTime - a.focusTime;
  });

  return (
    <div className={`fixed inset-0 z-[99999] overflow-hidden bg-black/60 backdrop-blur-md flex justify-end ${isRtl ? 'flex-row-reverse' : ''}`}>
      {/* Background Dimmer */}
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />
      
      {/* Side Panel */}
      <motion.div 
        initial={{ x: isRtl ? '-100%' : '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: isRtl ? '-100%' : '100%', opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="w-full max-w-sm h-full bg-[#f8fafc] dark:bg-[#0c0c0e] border-l border-r border-black/5 dark:border-white/5 relative z-10 flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center">
              <Users size={20} style={{ color: themeColor }} />
            </div>
            <h2 className="text-xl font-black text-black dark:text-white">{t.friends}</h2>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 flex items-center justify-center text-black dark:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 pt-4 gap-4 shrink-0">
          <button 
            onClick={() => setActiveTab('leaderboard')}
            className={`pb-3 text-sm font-bold tracking-wide uppercase transition-colors relative ${activeTab === 'leaderboard' ? 'text-black dark:text-white border-b-2' : 'text-gray-400 dark:text-white/40 border-b-2 border-transparent'}`}
            style={{ borderColor: activeTab === 'leaderboard' ? themeColor : 'transparent' }}
          >
            {t.leaderboard}
          </button>
          <button 
            onClick={() => setActiveTab('add')}
            className={`pb-3 text-sm font-bold tracking-wide uppercase transition-colors relative flex items-center gap-2 ${activeTab === 'add' ? 'text-black dark:text-white border-b-2' : 'text-gray-400 dark:text-white/40 border-b-2 border-transparent'}`}
            style={{ borderColor: activeTab === 'add' ? themeColor : 'transparent' }}
          >
            {t.addFriend}
            {requests.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center">{requests.length}</span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          ) : activeTab === 'leaderboard' ? (
            <div className="flex flex-col gap-4">
              {sortedFriends.length === 0 ? (
                <div className="text-center py-10 opacity-50">
                  <Users size={40} className="mx-auto mb-4 opacity-50" />
                  <p className="text-sm font-bold">{t.noFriends}</p>
                </div>
              ) : (
                <>
                  {sortedFriends.length > 1 && (
                    <div className="flex items-end justify-center gap-4 mb-6 pt-6">
                      {/* 2nd Place */}
                      {sortedFriends.length > 1 && (
                        <div className="flex flex-col items-center">
                          <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center font-black text-lg mb-2 shadow-inner border border-white/20">
                            {sortedFriends[1].name.charAt(0).toUpperCase()}
                          </div>
                          <div className="text-[10px] font-black tracking-wider opacity-50 mb-1">2ND</div>
                          <div className="w-16 h-20 bg-gradient-to-t from-gray-300 to-gray-200 dark:from-white/10 dark:to-white/5 rounded-t-xl flex flex-col items-center justify-center font-black border-t border-l border-r border-white/20 dark:border-white/5">
                            <span className="text-sm">{Math.round(getScore(sortedFriends[1]) * 100)}%</span>
                          </div>
                          <div className="text-[10px] font-bold mt-2 truncate max-w-[60px] opacity-70">{sortedFriends[1].name}</div>
                        </div>
                      )}
                      
                      {/* 1st Place */}
                      {sortedFriends.length > 0 && (
                        <div className="flex flex-col items-center relative">
                          <Crown size={32} className="text-yellow-500 rotate-12 absolute -top-8 drop-shadow-md" strokeWidth={2.5} />
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 border-2 border-yellow-200 flex items-center justify-center font-black text-xl mb-2 text-white shadow-lg">
                            {sortedFriends[0].name.charAt(0).toUpperCase()}
                          </div>
                          <div className="text-[10px] font-black tracking-wider text-yellow-600 dark:text-yellow-500 mb-1">1ST</div>
                          <div className="w-20 h-28 bg-gradient-to-t from-yellow-200 to-yellow-100 dark:from-yellow-500/20 dark:to-yellow-500/10 rounded-t-xl flex flex-col items-center justify-center font-black text-yellow-700 dark:text-yellow-400 text-xl border-t border-l border-r border-yellow-300/50 dark:border-yellow-500/20 shadow-[0_0_20px_rgba(234,179,8,0.15)] relative overflow-hidden">
                            <div className="absolute inset-0 bg-white/20 dark:bg-white/5 skew-y-12 translate-y-1/2"></div>
                            <span className="relative z-10">{Math.round(getScore(sortedFriends[0]) * 100)}%</span>
                          </div>
                          <div className="text-[11px] font-black mt-2 truncate max-w-[80px]">{sortedFriends[0].name}</div>
                        </div>
                      )}
                      
                      {/* 3rd Place */}
                      {sortedFriends.length > 2 && (
                        <div className="flex flex-col items-center">
                          <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center font-black text-lg mb-2 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/30">
                            {sortedFriends[2].name.charAt(0).toUpperCase()}
                          </div>
                          <div className="text-[10px] font-black tracking-wider opacity-50 mb-1 text-orange-600 dark:text-orange-400">3RD</div>
                          <div className="w-16 h-16 bg-gradient-to-t from-orange-200/50 to-orange-100/50 dark:from-orange-500/10 dark:to-orange-500/5 rounded-t-xl flex flex-col items-center justify-center font-black text-orange-700 dark:text-orange-400 border-t border-l border-r border-orange-200/50 dark:border-orange-500/20">
                            <span className="text-sm">{Math.round(getScore(sortedFriends[2]) * 100)}%</span>
                          </div>
                          <div className="text-[10px] font-bold mt-2 truncate max-w-[60px] opacity-70">{sortedFriends[2].name}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {sortedFriends.map((f, i) => (
                    <div key={f.id} className="relative overflow-hidden bg-white dark:bg-[#1a1b1e] border border-black/5 dark:border-white/5 rounded-2xl p-4 flex items-center gap-4 shadow-sm group">
                      {/* Rank Badge */}
                      <div className="w-10 h-10 shrink-0 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center font-black text-sm relative">
                        {i === 0 ? <Crown size={18} className="text-yellow-500" /> : i + 1}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-black dark:text-white truncate">{f.name}</h4>
                        <div className="flex items-center gap-3 mt-1.5 opacity-60">
                          <div className="flex items-center gap-1 text-[11px] font-bold tracking-wide">
                            <Clock size={10} />
                            {formatTime(f.focusTime)}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] font-bold tracking-wide">
                            <Check size={10} />
                            {Math.round(getScore(f) * 100)}% ({f.habitsCompleted}/{f.habitsTotal})
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={() => handleDeclineOrRemove(null, f.id)}
                        className="w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-red-500/10 text-red-500 transition-all absolute right-4"
                        title={t.remove}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {/* My Code Section */}
              <div className="bg-white dark:bg-[#1a1b1e] border border-black/5 dark:border-white/5 rounded-3xl p-6 shadow-sm text-center">
                <p className="text-xs font-bold tracking-widest uppercase opacity-50 mb-3">{t.myCode}</p>
                <div className="flex items-center justify-center gap-3 mb-4">
                  <span className="text-3xl font-black tracking-widest text-black dark:text-white">{friendCode}</span>
                </div>
                <button 
                  onClick={handleCopyCode}
                  className="w-full py-3 rounded-2xl font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-all active:scale-95"
                  style={{ backgroundColor: copied ? '#10B981' : `${themeColor}20`, color: copied ? '#fff' : themeColor }}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? t.copied : t.copy}
                </button>
              </div>

              {/* Add Friend Form */}
              <div className="flex flex-col gap-3">
                <form onSubmit={handleSendRequest} className="relative">
                  <input 
                    type="text" 
                    value={addCode}
                    onChange={(e) => setAddCode(e.target.value.toUpperCase())}
                    placeholder={t.enterCode}
                    maxLength={6}
                    className="w-full bg-white dark:bg-[#1a1b1e] border border-black/10 dark:border-white/10 rounded-2xl px-5 py-4 text-center text-lg font-black tracking-widest placeholder:opacity-30 focus:outline-none focus:border-current transition-colors uppercase"
                    style={{ outlineColor: themeColor }}
                  />
                  <button 
                    type="submit"
                    disabled={addLoading || addCode.length < 6}
                    className="mt-3 w-full py-4 rounded-2xl font-bold text-sm tracking-wide text-white transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                    style={{ backgroundColor: themeColor }}
                  >
                    {addLoading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                    {t.sendRequest}
                  </button>
                </form>
                {addMessage && (
                  <p className="text-xs text-center font-bold" style={{ color: addMessage.includes('Error') ? '#EF4444' : themeColor }}>
                    {addMessage}
                  </p>
                )}
              </div>

              {/* Pending Requests */}
              {requests.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h3 className="text-xs font-bold tracking-widest uppercase opacity-50 px-2">{t.pendingRequests}</h3>
                  {requests.map(r => (
                    <div key={r.id} className="bg-white dark:bg-[#1a1b1e] border border-black/5 dark:border-white/5 rounded-2xl p-4 flex items-center justify-between shadow-sm gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-black dark:text-white truncate">{r.user.name}</h4>
                        <p className="text-xs opacity-50 truncate">Code: {r.user.friendCode}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleAccept(r.id)}
                          className="w-9 h-9 rounded-full bg-[#10B981]/10 text-[#10B981] hover:bg-[#10B981]/20 flex items-center justify-center transition-colors"
                        >
                          <Check size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeclineOrRemove(r.id, null)}
                          className="w-9 h-9 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 flex items-center justify-center transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
