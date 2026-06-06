"use client";
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Users, Shield, Loader2, UserX, Check, ShieldAlert, BarChart3, Activity, Target } from 'lucide-react';
import { translations } from '../lib/translations';

export default function AdminPanel({ isOpen, onClose, lang, themeColor, isRtl }) {
  const [activeTab, setActiveTab] = useState('overview'); // overview, users, groups
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const t = translations[lang] || translations.en;

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'overview') {
        const res = await fetch('/api/admin/overview');
        if (res.ok) {
          const data = await res.json();
          setOverview(data.overview);
        } else {
          setError('Failed to fetch overview metrics');
        }
      } else if (activeTab === 'users') {
        const res = await fetch('/api/admin/users');
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users || []);
        } else {
          setError('Failed to fetch users');
        }
      } else {
        const res = await fetch('/api/admin/groups');
        if (res.ok) {
          const data = await res.json();
          setGroups(data.groups || []);
        } else {
          setError('Failed to fetch groups');
        }
      }
    } catch (err) {
      setError('An error occurred');
    }
    setLoading(false);
  };

  const handleToggleBlock = async (userId, currentStatus) => {
    try {
      const action = currentStatus ? 'unblock' : 'block';
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: userId, action })
      });
      if (res.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, isBlocked: !currentStatus } : u));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update block status');
      }
    } catch (err) {
      alert('Error updating user');
    }
  };

  const handleToggleAdmin = async (userId, currentStatus) => {
    try {
      const action = currentStatus ? 'removeAdmin' : 'makeAdmin';
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: userId, action })
      });
      if (res.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, isAdmin: !currentStatus } : u));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update admin status');
      }
    } catch (err) {
      alert('Error updating user');
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-[99999] overflow-hidden bg-black/60 backdrop-blur-md flex justify-end ${isRtl ? 'flex-row-reverse' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Background Dimmer */}
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />
      
      {/* Side Panel */}
      <motion.div 
        initial={{ x: isRtl ? '-100%' : '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: isRtl ? '-100%' : '100%', opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="w-full max-w-lg h-full bg-[#f8fafc] dark:bg-[#0c0c0e] border-l border-r border-black/5 dark:border-white/5 relative z-10 flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Shield size={20} className="text-purple-500" />
            </div>
            <h2 className="text-xl font-black text-black dark:text-white">Admin Dashboard</h2>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 flex items-center justify-center text-black dark:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 pt-4 gap-4 shrink-0 overflow-x-auto scrollbar-hide border-b border-black/5 dark:border-white/5">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`pb-3 text-sm font-bold tracking-wide uppercase transition-colors whitespace-nowrap relative flex items-center gap-2 ${activeTab === 'overview' ? 'text-black dark:text-white border-b-2' : 'text-gray-400 dark:text-white/40 border-b-2 border-transparent'}`}
            style={{ borderColor: activeTab === 'overview' ? '#A855F7' : 'transparent' }}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`pb-3 text-sm font-bold tracking-wide uppercase transition-colors whitespace-nowrap relative flex items-center gap-2 ${activeTab === 'users' ? 'text-black dark:text-white border-b-2' : 'text-gray-400 dark:text-white/40 border-b-2 border-transparent'}`}
            style={{ borderColor: activeTab === 'users' ? '#A855F7' : 'transparent' }}
          >
            Users
          </button>
          <button 
            onClick={() => setActiveTab('groups')}
            className={`pb-3 text-sm font-bold tracking-wide uppercase transition-colors whitespace-nowrap relative ${activeTab === 'groups' ? 'text-black dark:text-white border-b-2' : 'text-gray-400 dark:text-white/40 border-b-2 border-transparent'}`}
            style={{ borderColor: activeTab === 'groups' ? '#A855F7' : 'transparent' }}
          >
            Groups
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          {error && (
            <div className="mb-4 p-4 bg-red-500/10 text-red-500 rounded-xl text-sm font-bold flex items-center gap-2">
              <ShieldAlert size={16} /> {error}
            </div>
          )}
          
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          ) : activeTab === 'overview' && overview ? (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-[#1a1b1e] border border-black/5 dark:border-white/5 rounded-2xl p-5 shadow-sm flex flex-col gap-2">
                  <div className="flex items-center gap-2 opacity-50 mb-1">
                    <Users size={16} />
                    <span className="text-[10px] font-black tracking-widest uppercase">Total Users</span>
                  </div>
                  <span className="text-3xl font-black text-purple-500">{overview.totalUsers}</span>
                </div>
                <div className="bg-white dark:bg-[#1a1b1e] border border-black/5 dark:border-white/5 rounded-2xl p-5 shadow-sm flex flex-col gap-2">
                  <div className="flex items-center gap-2 opacity-50 mb-1">
                    <Users size={16} />
                    <span className="text-[10px] font-black tracking-widest uppercase">Study Groups</span>
                  </div>
                  <span className="text-3xl font-black text-purple-500">{overview.totalGroups}</span>
                </div>
                <div className="bg-white dark:bg-[#1a1b1e] border border-black/5 dark:border-white/5 rounded-2xl p-5 shadow-sm flex flex-col gap-2">
                  <div className="flex items-center gap-2 opacity-50 mb-1">
                    <Target size={16} />
                    <span className="text-[10px] font-black tracking-widest uppercase">Habits Done</span>
                  </div>
                  <span className="text-3xl font-black text-purple-500">{overview.totalHabitsCompleted}</span>
                </div>
                <div className="bg-white dark:bg-[#1a1b1e] border border-black/5 dark:border-white/5 rounded-2xl p-5 shadow-sm flex flex-col gap-2">
                  <div className="flex items-center gap-2 opacity-50 mb-1">
                    <Activity size={16} />
                    <span className="text-[10px] font-black tracking-widest uppercase">Total Focus Time</span>
                  </div>
                  <span className="text-3xl font-black text-purple-500">{Math.round((overview.totalFocusTime || 0) / 60)}h</span>
                </div>
              </div>
            </div>
          ) : activeTab === 'users' ? (
            <div className="flex flex-col gap-4">
              {users.map((u) => (
                <div key={u.id} className={`relative overflow-hidden bg-white dark:bg-[#1a1b1e] border ${u.isBlocked ? 'border-red-500/30' : 'border-black/5 dark:border-white/5'} rounded-2xl p-4 flex flex-col gap-3 shadow-sm`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm">{u.name || 'Unknown'}</span>
                        {u.isAdmin && <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-500 text-[10px] font-black tracking-widest uppercase">Admin</span>}
                        {u.isBlocked && <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-500 text-[10px] font-black tracking-widest uppercase">Blocked</span>}
                      </div>
                      <span className="text-xs opacity-50 block mt-1">{u.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleAdmin(u.id, u.isAdmin)}
                        className={`h-8 px-3 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold transition-all ${u.email === '3yin3yin@gmail.com' ? 'opacity-20 cursor-not-allowed' : u.isAdmin ? 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20' : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10'}`}
                        title={u.email === '3yin3yin@gmail.com' ? 'Primary admin cannot be demoted' : 'Toggle Admin Status'}
                        disabled={u.email === '3yin3yin@gmail.com'}
                      >
                        <Shield size={14} />
                        {u.isAdmin ? 'Admin' : 'Make Admin'}
                      </button>
                      <button
                        onClick={() => handleToggleBlock(u.id, u.isBlocked)}
                        className={`h-8 px-3 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold transition-all ${u.email === '3yin3yin@gmail.com' ? 'opacity-20 cursor-not-allowed' : u.isBlocked ? 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'}`}
                        title={u.email === '3yin3yin@gmail.com' ? 'Primary admin cannot be blocked' : 'Toggle Block Status'}
                        disabled={u.email === '3yin3yin@gmail.com'}
                      >
                        {u.isBlocked ? <Check size={14} /> : <UserX size={14} />}
                        {u.isBlocked ? 'Unblock' : 'Block'}
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2 border-t border-black/5 dark:border-white/5 pt-3 mt-1">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold opacity-50 uppercase tracking-wider">Code</span>
                      <span className="text-sm font-black text-purple-500">{u.friendCode}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold opacity-50 uppercase tracking-wider">Friends</span>
                      <span className="text-sm font-black">{u._count?.friendships || 0}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold opacity-50 uppercase tracking-wider">Groups</span>
                      <span className="text-sm font-black">{u._count?.groupMembers || 0}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold opacity-50 uppercase tracking-wider">Habits</span>
                      <span className="text-sm font-black">{u._count?.habits || 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {groups.map((g) => (
                <div key={g.id} className="relative overflow-hidden bg-white dark:bg-[#1a1b1e] border border-black/5 dark:border-white/5 rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
                  <div className="flex justify-between items-center border-b border-black/5 dark:border-white/5 pb-3 mb-1">
                    <div>
                      <h3 className="font-black text-sm">{g.name}</h3>
                      <p className="text-[10px] font-bold opacity-50 uppercase tracking-wider mt-1">{g.members?.length || 0} Members</p>
                    </div>
                    <div className="bg-purple-500/10 text-purple-500 px-3 py-1.5 rounded-lg font-black text-sm tracking-widest">
                      {g.code}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    {g.members?.map(m => (
                      <div key={m.id} className="flex items-center justify-between py-1">
                        <span className="text-xs font-bold opacity-80">{m.user?.name || 'Unknown'}</span>
                        <span className="text-[10px] font-mono opacity-50">{m.user?.friendCode}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
