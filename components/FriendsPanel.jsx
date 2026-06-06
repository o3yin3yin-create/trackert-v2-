"use client";
import { useState, useEffect } from 'react';
import { X, Users, UserPlus, Check, Trash2, Loader2, Trophy, Clock, Copy, Crown, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FriendsPanel({ onClose, lang = 'en', themeColor = '#10B981', friendCode = '' }) {
  const [activeTab, setActiveTab] = useState('friends'); // 'friends', 'groups', 'add'
  const [friends, setFriends] = useState([]);
  const [groups, setGroups] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [addCode, setAddCode] = useState('');
  const [groupName, setGroupName] = useState('');
  const [createGroupLoading, setCreateGroupLoading] = useState(false);
  const [joinGroupLoading, setJoinGroupLoading] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addMessage, setAddMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showAddGroup, setShowAddGroup] = useState(false);

  const isRtl = lang === 'ar';
  const t = {
    friends: isRtl ? 'الأصدقاء' : 'Friends',
    groups: isRtl ? 'المجموعات' : 'Groups',
    leaderboard: isRtl ? 'المنافسة' : 'Leaderboard',
    addFriend: isRtl ? 'إضافة' : 'Add',
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
    habits: isRtl ? 'عادات' : 'Habits',
    noFriends: isRtl ? 'لا يوجد أصدقاء للمنافسة 1 ضد 1.' : 'No friends for 1-on-1 competition.',
    noGroups: isRtl ? 'لا يوجد مجموعات مذاكرة. قم بإنشاء أو الانضمام لمجموعة.' : 'No study groups. Create or join one.',
    createGroup: isRtl ? 'إنشاء مجموعة' : 'Create Group',
    joinGroup: isRtl ? 'الانضمام لمجموعة' : 'Join Group',
    groupName: isRtl ? 'اسم المجموعة' : 'Group Name',
    groupCode: isRtl ? 'كود المجموعة' : 'Group Code',
    groupCreated: isRtl ? 'تم إنشاء المجموعة!' : 'Group Created!',
    groupJoined: isRtl ? 'تم الانضمام للمجموعة!' : 'Group Joined!',
    you: isRtl ? 'أنت' : 'You',
    min: isRtl ? 'د' : 'm',
    h: isRtl ? 'س' : 'h',
  };

  const fetchData = async () => {
    try {
      const [friendsRes, groupsRes] = await Promise.all([
        fetch('/api/friends'),
        fetch('/api/groups')
      ]);
      const friendsData = await friendsRes.json();
      const groupsData = await groupsRes.json();
      
      if (friendsData.friends) {
        setFriends(friendsData.friends);
        setCurrentUser(friendsData.currentUser);
      }
      if (friendsData.requests) setRequests(friendsData.requests);
      if (groupsData.groups) setGroups(groupsData.groups);
      
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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
        fetchData();
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
      if (res.ok) fetchData();
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
      if (res.ok) fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    setCreateGroupLoading(true);
    setAddMessage('');
    try {
      const res = await fetch('/api/groups/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: groupName })
      });
      const data = await res.json();
      if (data.success) {
        setAddMessage(t.groupCreated);
        setGroupName('');
        fetchData();
        setActiveTab('groups');
      } else {
        setAddMessage(data.error);
      }
    } catch (e) {
      setAddMessage('Error creating group');
    }
    setCreateGroupLoading(false);
  };

  const handleJoinGroup = async (e) => {
    e.preventDefault();
    if (!addCode.trim()) return;
    setJoinGroupLoading(true);
    setAddMessage('');
    try {
      const res = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: addCode })
      });
      const data = await res.json();
      if (data.success) {
        setAddMessage(t.groupJoined);
        setAddCode('');
        fetchData();
        setActiveTab('groups');
      } else {
        setAddMessage(data.error);
      }
    } catch (e) {
      setAddMessage('Error joining group');
    }
    setJoinGroupLoading(false);
  };

  const handleLeaveGroup = async (groupId) => {
    if (!confirm(t.confirmLeave || 'Are you sure you want to leave this group?')) return;
    try {
      const res = await fetch('/api/groups/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId })
      });
      if (res.ok) {
        fetchData();
      }
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
        <div className="flex px-6 pt-4 gap-4 shrink-0 overflow-x-auto scrollbar-hide">
          <button 
            onClick={() => setActiveTab('friends')}
            className={`pb-3 text-sm font-bold tracking-wide uppercase transition-colors whitespace-nowrap relative flex items-center gap-2 ${activeTab === 'friends' ? 'text-black dark:text-white border-b-2' : 'text-gray-400 dark:text-white/40 border-b-2 border-transparent'}`}
            style={{ borderColor: activeTab === 'friends' ? themeColor : 'transparent' }}
          >
            {t.friends}
            {requests.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center">{requests.length}</span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('groups')}
            className={`pb-3 text-sm font-bold tracking-wide uppercase transition-colors whitespace-nowrap relative ${activeTab === 'groups' ? 'text-black dark:text-white border-b-2' : 'text-gray-400 dark:text-white/40 border-b-2 border-transparent'}`}
            style={{ borderColor: activeTab === 'groups' ? themeColor : 'transparent' }}
          >
            {t.groups}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          ) : activeTab === 'friends' ? (
            <div className="flex flex-col gap-6">
              
              {/* Toggle Add Friend Button */}
              {!showAddFriend && (
                <button 
                  onClick={() => setShowAddFriend(true)}
                  className="w-full bg-white dark:bg-[#1a1b1e] border border-black/10 dark:border-white/10 rounded-2xl p-4 flex items-center justify-center gap-2 shadow-sm font-bold text-sm tracking-wide transition-all active:scale-95"
                  style={{ color: themeColor }}
                >
                  <UserPlus size={18} />
                  {t.addFriend || 'Add Friend'}
                </button>
              )}

              {/* Add Friend Section */}
              {showAddFriend && (
                <div className="flex flex-col gap-6 bg-black/5 dark:bg-white/5 p-4 rounded-3xl relative">
                  <button 
                    onClick={() => setShowAddFriend(false)}
                    className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 transition-colors"
                  >
                    <X size={14} />
                  </button>
                  
                  {/* My Friend Code */}
                  <div className="bg-white dark:bg-[#1a1b1e] border border-black/10 dark:border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-sm mt-4">
                    <div>
                      <h3 className="text-[10px] font-bold tracking-widest uppercase opacity-50">{t.myCode}</h3>
                      <p className="text-xl font-black tracking-widest mt-1" style={{ color: themeColor }}>{friendCode}</p>
                    </div>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(friendCode);
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
                    >
                      {t.copy}
                    </button>
                  </div>

                  {/* Add Friend Form inline */}
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
                    {addMessage && activeTab === 'friends' && (
                      <p className="text-xs text-center font-bold" style={{ color: addMessage.includes('Error') ? '#EF4444' : themeColor }}>
                        {addMessage}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Pending Requests */}
              {requests.length > 0 && (
                <div className="flex flex-col gap-3 pb-6 border-b border-black/5 dark:border-white/5">
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

              {/* Friends List */}
              <div className="flex flex-col gap-4">
                {friends.length === 0 ? (
                <div className="text-center py-10 opacity-50">
                  <Users size={40} className="mx-auto mb-4 opacity-50" />
                  <p className="text-sm font-bold">{t.noFriends}</p>
                </div>
              ) : (
                friends.map((f) => {
                  const myScore = currentUser ? getScore(currentUser) : 0;
                  const theirScore = getScore(f);
                  const iAmWinning = myScore > theirScore || (myScore === theirScore && (currentUser?.focusTime || 0) >= f.focusTime);
                  
                  return (
                    <div key={f.id} className="relative overflow-hidden bg-white dark:bg-[#1a1b1e] border border-black/5 dark:border-white/5 rounded-2xl p-5 flex flex-col gap-4 shadow-sm group">
                      {/* Name and remove button */}
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-black text-sm tracking-wide">{f.name}</span>
                        <button 
                          onClick={() => handleDeclineOrRemove(null, f.id)}
                          className="w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-red-500/10 text-red-500 transition-all"
                          title={t.remove}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      
                      {/* Comparison UI */}
                      <div className="flex items-center justify-between">
                        {/* Me */}
                        <div className={`flex flex-col items-center flex-1 ${iAmWinning ? '' : 'opacity-40 grayscale'}`}>
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg mb-2 shadow-sm ${iAmWinning ? 'bg-gradient-to-br from-yellow-300 to-yellow-500 text-white border-2 border-yellow-200' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 border border-black/10 dark:border-white/10'}`}>
                            {t.you.charAt(0)}
                          </div>
                          <span className={`text-xs font-black ${iAmWinning ? 'text-yellow-600 dark:text-yellow-500' : ''}`}>{Math.round(myScore * 100)}%</span>
                          <div className="flex gap-2 mt-2 text-[10px] font-bold opacity-50">
                            <span>{currentUser?.habitsCompleted || 0}/{currentUser?.habitsTotal || 0} {t.items || 'items'}</span>
                            <span>•</span>
                            <span>{formatTime(currentUser?.focusTime || 0)}</span>
                          </div>
                        </div>
                        
                        <div className="text-[10px] font-black tracking-widest opacity-20 px-2">VS</div>
                        
                        {/* Them */}
                        <div className={`flex flex-col items-center flex-1 ${!iAmWinning ? '' : 'opacity-40 grayscale'}`}>
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg mb-2 shadow-sm ${!iAmWinning ? 'bg-gradient-to-br from-yellow-300 to-yellow-500 text-white border-2 border-yellow-200' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 border border-black/10 dark:border-white/10'}`}>
                            {f.name.charAt(0).toUpperCase()}
                          </div>
                          <span className={`text-xs font-black ${!iAmWinning ? 'text-yellow-600 dark:text-yellow-500' : ''}`}>{Math.round(theirScore * 100)}%</span>
                          <div className="flex gap-2 mt-2 text-[10px] font-bold opacity-50">
                            <span>{f.habitsCompleted || 0}/{f.habitsTotal || 0} {t.items || 'items'}</span>
                            <span>•</span>
                            <span>{formatTime(f.focusTime || 0)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              </div>
            </div>
          ) : activeTab === 'groups' ? (
            <div className="flex flex-col gap-6">

              {/* Toggle Add Group Button */}
              {!showAddGroup && (
                <button 
                  onClick={() => setShowAddGroup(true)}
                  className="w-full bg-white dark:bg-[#1a1b1e] border border-black/10 dark:border-white/10 rounded-2xl p-4 flex items-center justify-center gap-2 shadow-sm font-bold text-sm tracking-wide transition-all active:scale-95"
                  style={{ color: themeColor }}
                >
                  <Users size={18} />
                  {t.joinGroup || 'Join / Create Group'}
                </button>
              )}

              {/* Join/Create Group Form inline */}
              {showAddGroup && (
                <div className="flex flex-col gap-4 bg-black/5 dark:bg-white/5 p-4 rounded-3xl relative mb-2">
                  <button 
                    onClick={() => setShowAddGroup(false)}
                    className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 transition-colors"
                  >
                    <X size={14} />
                  </button>
                  
                  <div className="mt-4 flex flex-col gap-4">
                    <form onSubmit={handleJoinGroup} className="flex flex-col gap-3">
                      <input 
                        type="text" 
                        value={addCode}
                        onChange={(e) => setAddCode(e.target.value.toUpperCase())}
                        placeholder={t.groupCode}
                        className="w-full bg-white dark:bg-[#1a1b1e] border border-black/10 dark:border-white/10 rounded-2xl px-5 py-4 text-center text-sm font-black tracking-widest placeholder:opacity-30 focus:outline-none focus:border-current transition-colors uppercase"
                        style={{ outlineColor: themeColor }}
                      />
                      <button 
                        type="submit"
                        disabled={joinGroupLoading || !addCode}
                        className="w-full py-4 rounded-2xl font-bold text-sm tracking-wide transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                        style={{ backgroundColor: themeColor, color: themeColor.toLowerCase() === '#ffffff' ? '#000' : '#fff' }}
                      >
                        {joinGroupLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                        {t.joinGroup || 'Join Group'}
                      </button>
                    </form>
                    
                    <form onSubmit={(e) => { e.preventDefault(); handleCreateGroup(); }} className="flex flex-col gap-3 pt-4 border-t border-black/10 dark:border-white/10">
                      <input 
                        type="text" 
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        placeholder={t.groupName}
                        className="w-full bg-white dark:bg-[#1a1b1e] border border-black/10 dark:border-white/10 rounded-2xl px-5 py-4 text-center text-sm font-black placeholder:opacity-30 focus:outline-none focus:border-current transition-colors"
                        style={{ outlineColor: themeColor }}
                      />
                      <button 
                        type="submit"
                        disabled={createGroupLoading || !groupName}
                        className="w-full py-4 rounded-2xl font-bold text-sm tracking-wide transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                        style={{ backgroundColor: themeColor, color: themeColor.toLowerCase() === '#ffffff' ? '#000' : '#fff' }}
                      >
                        {createGroupLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                        {t.createGroup || 'Create Group'}
                      </button>
                    </form>
                  </div>
                  {addMessage && activeTab === 'groups' && (
                    <p className="text-xs text-center font-bold mt-1" style={{ color: addMessage.includes('Error') ? '#EF4444' : themeColor }}>
                      {addMessage}
                    </p>
                  )}
                </div>
              )}

              {groups.length === 0 ? (
                <div className="text-center py-10 opacity-50">
                  <Users size={40} className="mx-auto mb-4 opacity-50" />
                  <p className="text-sm font-bold">{t.noGroups}</p>
                </div>
              ) : (
                groups.map((g) => {
                  const sortedMembers = [...g.members].sort((a, b) => {
                    const scoreA = getScore(a);
                    const scoreB = getScore(b);
                    if (scoreB !== scoreA) return scoreB - scoreA;
                    return b.focusTime - a.focusTime;
                  });

                  return (
                    <div key={g.id} className="bg-white dark:bg-[#1a1b1e] border border-black/5 dark:border-white/5 rounded-3xl p-6 shadow-sm flex flex-col gap-6 relative overflow-hidden group">
                      {/* Ambient Background glow based on top member */}
                      <div className="absolute -top-24 -right-24 w-48 h-48 bg-yellow-500/10 blur-3xl rounded-full pointer-events-none" />
                      
                      <div className="flex justify-between items-start relative z-10">
                        <div>
                          <h3 className="font-black text-2xl tracking-tight text-black dark:text-white mb-2">{g.name}</h3>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black tracking-widest uppercase opacity-50 bg-black/5 dark:bg-white/5 px-2 py-1 rounded-md flex items-center gap-1">
                              <Users size={10} /> {sortedMembers.length} {t.members || 'MEMBERS'}
                            </span>
                            <span className="text-[10px] font-black tracking-widest uppercase opacity-50 bg-black/5 dark:bg-white/5 px-2 py-1 rounded-md flex items-center gap-1 cursor-copy" onClick={() => navigator.clipboard.writeText(g.code)} title={t.copy}>
                              {g.code}
                            </span>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleLeaveGroup(g.id)}
                          className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center hover:bg-red-500 hover:text-white text-red-500 transition-all opacity-0 group-hover:opacity-100"
                          title={t.remove || 'Leave'}
                        >
                          <LogOut size={14} />
                        </button>
                      </div>

                      {/* Members Leaderboard */}
                      <div className="flex flex-col gap-3 relative z-10">
                        {sortedMembers.map((m, i) => {
                          const score = Math.round(getScore(m) * 100);
                          const isFirst = i === 0;
                          const isSecond = i === 1;
                          const isThird = i === 2;
                          const isMe = m.id === currentUser?.id;

                          return (
                            <div key={m.id} className={`flex flex-col p-3 rounded-2xl border transition-all ${isFirst ? 'bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/10 dark:to-amber-900/10 border-yellow-200/50 dark:border-yellow-500/20 shadow-sm' : isMe ? 'bg-black/5 dark:bg-white/5 border-transparent' : 'bg-transparent border-transparent opacity-80'}`}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${isFirst ? 'bg-yellow-400 text-yellow-900' : isSecond ? 'bg-gray-300 text-gray-800' : isThird ? 'bg-amber-600 text-white' : 'bg-black/10 dark:bg-white/10 text-black dark:text-white'}`}>
                                    {isFirst ? <Crown size={14} /> : i + 1}
                                  </div>
                                  <div>
                                    <div className="text-sm font-bold flex items-center gap-2">
                                      {m.name}
                                      {isMe && <span className="text-[9px] font-black tracking-widest uppercase opacity-40 bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded">{t.you}</span>}
                                    </div>
                                    <div className="text-[10px] font-bold opacity-40 flex items-center gap-2">
                                      <span>{m.habitsCompleted || 0}/{m.habitsTotal || 0} {t.items || 'items'}</span>
                                      <span>•</span>
                                      <span>{formatTime(m.focusTime || 0)}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className={`text-lg font-black ${isFirst ? 'text-yellow-600 dark:text-yellow-500' : ''}`}>
                                  {score}%
                                </div>
                              </div>
                              
                              {/* Progress Bar */}
                              <div className="w-full bg-black/5 dark:bg-white/5 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-1000 ${isFirst ? 'bg-yellow-400 dark:bg-yellow-500' : isSecond ? 'bg-gray-400' : isThird ? 'bg-amber-600' : 'bg-black/20 dark:bg-white/20'}`} 
                                  style={{ width: `${score}%`, backgroundColor: isFirst || isSecond || isThird ? undefined : themeColor }} 
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}
