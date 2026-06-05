"use client";
import { useState, useEffect } from 'react';
import { X, Users, UserPlus, Check, Trash2, Loader2, Trophy, Clock, CheckCircle2, Copy } from 'lucide-react';
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
      const dateStr = new Date().toLocaleDateString('en-CA');
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
        setAddMessage(isRtl ? 'تم إرسال الطلب بنجاح!' : 'Request sent successfully!');
        setAddCode('');
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
            className={`pb-3 text-sm font-bold tracking-wide uppercase transition-colors relative ${activeTab === 'leaderboard' ? 'text-black dark:text-white' : 'text-gray-400 dark:text-white/40'}`}
          >
            {t.leaderboard}
            {activeTab === 'leaderboard' && <motion.div layoutId="friendsTab" className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ backgroundColor: themeColor }} />}
          </button>
          <button 
            onClick={() => setActiveTab('add')}
            className={`pb-3 text-sm font-bold tracking-wide uppercase transition-colors relative flex items-center gap-2 ${activeTab === 'add' ? 'text-black dark:text-white' : 'text-gray-400 dark:text-white/40'}`}
          >
            {t.addFriend}
            {requests.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center">{requests.length}</span>
            )}
            {activeTab === 'add' && <motion.div layoutId="friendsTab" className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ backgroundColor: themeColor }} />}
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
              {friends.length === 0 ? (
                <div className="text-center py-10 opacity-50">
                  <Users size={40} className="mx-auto mb-4 opacity-50" />
                  <p className="text-sm font-bold">{t.noFriends}</p>
                </div>
              ) : (
                friends.map((f, i) => (
                  <div key={f.id} className="relative overflow-hidden bg-white dark:bg-[#1a1b1e] border border-black/5 dark:border-white/5 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                    {/* Rank Badge */}
                    <div className="w-8 h-8 shrink-0 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center font-black text-sm">
                      {i === 0 ? '👑' : i + 1}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-black dark:text-white truncate">{f.name}</h4>
                      <div className="flex items-center gap-3 mt-1.5 opacity-60">
                        <div className="flex items-center gap-1 text-[11px] font-bold tracking-wide">
                          <Clock size={10} />
                          {formatTime(f.focusTime)}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-bold tracking-wide">
                          <CheckCircle2 size={10} />
                          {f.habitsCompleted} {t.habits}
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleDeclineOrRemove(null, f.id)}
                      className="w-8 h-8 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 focus:opacity-100 hover:bg-red-500/10 text-red-500 transition-all"
                      title={t.remove}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
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
