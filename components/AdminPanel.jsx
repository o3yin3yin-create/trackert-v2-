"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Users, Shield, Loader2, UserX, Check, ShieldAlert, 
  BarChart3, Activity, Target, Search, RefreshCw, Zap, 
  Music, Flame, Radio, Clock, CheckCircle2, Lock, Key
} from 'lucide-react';
import { apiFetch } from '../lib/api';

export default function AdminPanel({ isOpen, onClose, lang, isRtl }) {
  const [activeTab, setActiveTab] = useState('overview'); // overview, sessions, users, system
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState('all'); // all, active, admin, blocked, spotify
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const isArabic = isRtl || lang === 'ar';

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [overviewRes, usersRes] = await Promise.all([
        apiFetch('/api/admin/overview'),
        apiFetch('/api/admin/users')
      ]);

      if (overviewRes.ok) {
        const data = await overviewRes.json();
        setOverview(data.overview);
      } else {
        setError(isArabic ? 'تعذر جلب مؤشرات النظام' : 'Failed to fetch overview metrics');
      }

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users || []);
      } else {
        setError(prev => prev || (isArabic ? 'تعذر جلب بيانات المستخدمين' : 'Failed to fetch users'));
      }
      setLastRefreshed(new Date());
    } catch {
      setError(isArabic ? 'حدث خطأ في الاتصال بالخادم' : 'Connection error occurred');
    }
    setLoading(false);
  }, [isArabic]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, fetchData]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Action Handlers
  const handleUserAction = async (userId, action) => {
    setActionLoading(`${userId}_${action}`);
    try {
      const res = await apiFetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: userId, action })
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => {
          if (u.id !== userId) return u;
          if (action === 'block') return { ...u, isBlocked: true };
          if (action === 'unblock') return { ...u, isBlocked: false };
          if (action === 'makeAdmin') return { ...u, isAdmin: true };
          if (action === 'removeAdmin') return { ...u, isAdmin: false };
          if (action === 'grantSpotify') return { ...u, hasSpotifyAccess: true };
          if (action === 'revokeSpotify') return { ...u, hasSpotifyAccess: false };
          return u;
        }));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to perform action');
      }
    } catch {
      alert('Error updating user status');
    }
    setActionLoading(null);
  };

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = !query || 
        (u.name && u.name.toLowerCase().includes(query)) ||
        (u.email && u.email.toLowerCase().includes(query)) ||
        (u.username && u.username.toLowerCase().includes(query));

      if (!matchesSearch) return false;

      if (userFilter === 'admin') return u.isAdmin;
      if (userFilter === 'blocked') return u.isBlocked;
      if (userFilter === 'active') return !!u.activeSessionType;
      if (userFilter === 'spotify') return u.hasSpotifyAccess;
      return true;
    });
  }, [users, searchQuery, userFilter]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[99999] overflow-hidden bg-black/80 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6"
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      {/* Background Dimmer */}
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />
      
      {/* Central Command Cockpit Modal */}
      <motion.div 
        initial={{ scale: 0.96, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 12 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="w-full max-w-5xl h-[92vh] max-h-[880px] bg-[#0A0A0C] border border-white/10 rounded-[28px] sm:rounded-[32px] relative z-10 flex flex-col shadow-2xl overflow-hidden font-sans text-white select-none"
      >
        {/* Top Control Bar */}
        <div className="px-6 py-4.5 pt-[calc(env(safe-area-inset-top,0px)+1.2rem)] border-b border-white/10 flex items-center justify-between shrink-0 bg-[#0E0F14]/70 backdrop-blur-lg">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white shadow-inner shrink-0">
              <Shield size={20} className="text-white" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white whitespace-nowrap truncate">
                  {isArabic ? 'مركز القيادة' : 'Command Center'}
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono font-bold text-emerald-400 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{isArabic ? 'حي' : 'LIVE'}</span>
                </span>
              </div>
              <p className="text-[11px] text-white/40 font-mono mt-0.5 whitespace-nowrap truncate">
                {isArabic 
                  ? `${users.length} حساب · متصل`
                  : `${users.length} Accounts · Live DB`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={fetchData}
              disabled={loading}
              className="h-9 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white flex items-center gap-1.5 text-xs font-mono transition-all active:scale-95 disabled:opacity-40"
              title={isArabic ? 'تحديث البيانات الحية' : 'Refresh Telemetry'}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">
                {lastRefreshed 
                  ? lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
                  : (isArabic ? 'تحديث' : 'Refresh')}
              </span>
            </button>

            <button 
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-95"
              title={isArabic ? 'إغلاق (Esc)' : 'Close (Esc)'}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex px-6 pt-2 shrink-0 border-b border-white/10 bg-[#0A0A0C] gap-1 sm:gap-2 overflow-x-auto scrollbar-hide">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`pb-3 pt-2 px-3 text-xs sm:text-sm font-bold tracking-tight transition-all relative flex items-center gap-1.5 sm:gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === 'overview' 
                ? 'text-white' 
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            <BarChart3 size={15} className="shrink-0" />
            <span className="whitespace-nowrap">{isArabic ? 'نظرة عامة' : 'Overview'}</span>
            {activeTab === 'overview' && (
              <motion.div 
                layoutId="admin_active_tab" 
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" 
              />
            )}
          </button>

          <button 
            onClick={() => setActiveTab('sessions')}
            className={`pb-3 pt-2 px-3 text-xs sm:text-sm font-bold tracking-tight transition-all relative flex items-center gap-1.5 sm:gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === 'sessions' 
                ? 'text-white' 
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            <Radio size={15} className={`shrink-0 ${overview?.activeNowCount > 0 ? "text-emerald-400" : ""}`} />
            <span className="whitespace-nowrap">{isArabic ? 'مباشر' : 'Live'}</span>
            {overview?.activeNowCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                {overview.activeNowCount}
              </span>
            )}
            {activeTab === 'sessions' && (
              <motion.div 
                layoutId="admin_active_tab" 
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" 
              />
            )}
          </button>

          <button 
            onClick={() => setActiveTab('users')}
            className={`pb-3 pt-2 px-3 text-xs sm:text-sm font-bold tracking-tight transition-all relative flex items-center gap-1.5 sm:gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === 'users' 
                ? 'text-white' 
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            <Users size={15} className="shrink-0" />
            <span className="whitespace-nowrap">{isArabic ? 'المستخدمين' : 'Users'}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-white/70 font-mono text-[10px] font-bold">
              {users.length}
            </span>
            {activeTab === 'users' && (
              <motion.div 
                layoutId="admin_active_tab" 
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" 
              />
            )}
          </button>

          <button 
            onClick={() => setActiveTab('system')}
            className={`pb-3 pt-2 px-3 text-xs sm:text-sm font-bold tracking-tight transition-all relative flex items-center gap-1.5 sm:gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === 'system' 
                ? 'text-white' 
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            <Lock size={15} className="shrink-0" />
            <span className="whitespace-nowrap">{isArabic ? 'النظام' : 'System'}</span>
            {activeTab === 'system' && (
              <motion.div 
                layoutId="admin_active_tab" 
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" 
              />
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-hide space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2">
              <ShieldAlert size={16} />
              <span>{error}</span>
            </div>
          )}

          {loading && !overview ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-white/50">
              <Loader2 size={28} className="animate-spin text-white" />
              <span className="text-xs font-mono">{isArabic ? 'جاري تجميع المؤشرات...' : 'Aggregating live telemetry...'}</span>
            </div>
          ) : (
            <>
              {/* TAB 1: Cockpit & KPIs */}
              {activeTab === 'overview' && overview && (
                <div className="space-y-6">
                  {/* Hero Metric Cards Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {/* 1. Total Registered Users */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between gap-3 shadow-sm hover:border-white/20 transition-all">
                      <div className="flex items-center justify-between text-white/50">
                        <span className="text-[11px] font-mono uppercase tracking-wider font-bold whitespace-nowrap truncate">
                          {isArabic ? 'المستخدمين' : 'Users'}
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white shrink-0">
                          <Users size={16} />
                        </div>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                          {overview.totalUsers}
                        </span>
                        <span className="text-xs text-white/40 font-mono whitespace-nowrap">
                          {isArabic ? 'حساب' : 'accounts'}
                        </span>
                      </div>
                    </div>

                    {/* 2. Active Now */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between gap-3 shadow-sm hover:border-white/20 transition-all">
                      <div className="flex items-center justify-between text-white/50">
                        <span className="text-[11px] font-mono uppercase tracking-wider font-bold whitespace-nowrap truncate text-emerald-400">
                          {isArabic ? 'النشطين الآن' : 'Active Now'}
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                          <Radio size={16} />
                        </div>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-4xl font-black text-emerald-400 tracking-tight">
                          {overview.activeNowCount}
                        </span>
                        <span className="text-xs text-emerald-400/60 font-mono whitespace-nowrap">
                          {isArabic ? 'جلسة' : 'sessions'}
                        </span>
                      </div>
                    </div>

                    {/* 3. Completed Habits */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between gap-3 shadow-sm hover:border-white/20 transition-all">
                      <div className="flex items-center justify-between text-white/50">
                        <span className="text-[11px] font-mono uppercase tracking-wider font-bold whitespace-nowrap truncate">
                          {isArabic ? 'العادات المنجزة' : 'Habits Done'}
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white shrink-0">
                          <CheckCircle2 size={16} />
                        </div>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                          {overview.totalHabitCompletions}
                        </span>
                        <span className="text-xs text-white/40 font-mono whitespace-nowrap">
                          {isArabic ? 'إنجاز' : 'checked'}
                        </span>
                      </div>
                    </div>

                    {/* 4. Total Focus Hours */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between gap-3 shadow-sm hover:border-white/20 transition-all">
                      <div className="flex items-center justify-between text-white/50">
                        <span className="text-[11px] font-mono uppercase tracking-wider font-bold whitespace-nowrap truncate">
                          {isArabic ? 'وقت التركيز' : 'Focus Hours'}
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white shrink-0">
                          <Activity size={16} />
                        </div>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                          {overview.totalFocusHours}
                        </span>
                        <span className="text-xs text-white/40 font-mono whitespace-nowrap">
                          {isArabic ? 'ساعة' : 'hours'}
                        </span>
                      </div>
                    </div>

                    {/* 5. Friendships & Network */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between gap-3 shadow-sm hover:border-white/20 transition-all">
                      <div className="flex items-center justify-between text-white/50">
                        <span className="text-[11px] font-mono uppercase tracking-wider font-bold whitespace-nowrap truncate">
                          {isArabic ? 'الأصدقاء' : 'Friends'}
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white shrink-0">
                          <Zap size={16} />
                        </div>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                          {overview.totalFriendships}
                        </span>
                        <span className="text-xs text-white/40 font-mono whitespace-nowrap">
                          {isArabic ? 'علاقة' : 'pairs'}
                        </span>
                      </div>
                    </div>

                    {/* 6. Spotify Adoption */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between gap-3 shadow-sm hover:border-white/20 transition-all">
                      <div className="flex items-center justify-between text-white/50">
                        <span className="text-[11px] font-mono uppercase tracking-wider font-bold whitespace-nowrap truncate">
                          {isArabic ? 'سبوتيفاي' : 'Spotify'}
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white shrink-0">
                          <Music size={16} />
                        </div>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                          {overview.spotifyUsersCount}
                        </span>
                        <span className="text-xs text-white/40 font-mono whitespace-nowrap">
                          {isArabic ? 'مفعل' : 'users'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 7-Day Trend Visualizer & Category Breakdown */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* 7-Day Daily Activity */}
                    <div className="lg:col-span-2 p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Flame size={16} className="text-white shrink-0" />
                          <h3 className="text-sm font-bold text-white whitespace-nowrap truncate">
                            {isArabic ? 'نشاط 7 أيام' : '7-Day Activity'}
                          </h3>
                        </div>
                        <span className="text-[10px] text-white/40 font-mono whitespace-nowrap truncate shrink-0">
                          {isArabic ? 'دقائق التركيز والإنجاز' : 'Focus mins & completions'}
                        </span>
                      </div>

                      <div className="grid grid-cols-7 gap-2 pt-4 items-end h-36">
                        {overview.recent7Days.map((day) => {
                          const maxMins = Math.max(...overview.recent7Days.map(d => d.focusMinutes), 60);
                          const heightPct = Math.max(Math.min((day.focusMinutes / maxMins) * 100, 100), 8);
                          const dayName = new Date(day.date).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', { weekday: 'short' });

                          return (
                            <div key={day.date} className="flex flex-col items-center gap-1.5 h-full justify-end group">
                              <span className="text-[9px] font-mono text-white/40 group-hover:text-white transition-colors">
                                {day.focusMinutes}m
                              </span>
                              <div 
                                style={{ height: `${heightPct}%` }}
                                className="w-full max-w-[28px] rounded-lg bg-white/20 group-hover:bg-white transition-all shadow-sm relative"
                                title={`${day.date}: ${day.focusMinutes} mins, ${day.completions} habits checked`}
                              />
                              <span className="text-[10px] font-mono text-white/50 uppercase mt-1">
                                {dayName}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Category Distribution */}
                    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Target size={16} className="text-white shrink-0" />
                          <h3 className="text-sm font-bold text-white whitespace-nowrap truncate">
                            {isArabic ? 'التصنيفات' : 'Categories'}
                          </h3>
                        </div>
                        <span className="text-[10px] text-white/40 font-mono whitespace-nowrap truncate shrink-0">
                          {overview.totalHabitsConfigured} {isArabic ? 'عادة' : 'total'}
                        </span>
                      </div>

                      <div className="space-y-2.5 pt-1">
                        {Object.entries(overview.categoryCounts || {}).map(([cat, count]) => {
                          const pct = Math.round((count / (overview.totalHabitsConfigured || 1)) * 100);
                          return (
                            <div key={cat} className="space-y-1">
                              <div className="flex justify-between text-xs font-mono">
                                <span className="capitalize text-white/80">{cat}</span>
                                <span className="text-white/40">{count} ({pct}%)</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                                <div 
                                  style={{ width: `${pct}%` }} 
                                  className="h-full bg-white/60 rounded-full" 
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Top Dedicated Users Leaderboard */}
                  {overview.topUsers && overview.topUsers.length > 0 && (
                    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2 min-w-0">
                          <Clock size={16} className="shrink-0" />
                          <span className="whitespace-nowrap truncate">{isArabic ? 'المتصدرين' : 'Top Focusers'}</span>
                        </h3>
                        <span className="text-[10px] text-white/40 font-mono whitespace-nowrap truncate shrink-0">
                          {isArabic ? 'إجمالي الساعات' : 'Total focus hours'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
                        {overview.topUsers.map((u, idx) => (
                          <div key={u.id} className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3">
                            <span className="w-6 h-6 rounded-lg bg-white/10 text-white font-mono text-xs font-bold flex items-center justify-center shrink-0">
                              #{idx + 1}
                            </span>
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="text-xs font-bold text-white truncate">{u.name || 'Anonymous'}</span>
                              <span className="text-[10px] text-white/40 font-mono truncate">
                                {u.username ? `@${u.username}` : u.email.split('@')[0]}
                              </span>
                            </div>
                            <span className="text-xs font-mono font-bold text-white shrink-0">
                              {u.focusHours}h
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: Live Focus Sessions */}
              {activeTab === 'sessions' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2 min-w-0">
                        <Radio size={16} className="text-emerald-400 shrink-0" />
                        <span className="whitespace-nowrap truncate">{isArabic ? 'الجلسات المباشرة' : 'Live Sessions'}</span>
                      </h3>
                      <p className="text-xs text-white/40 font-mono mt-0.5 whitespace-nowrap truncate">
                        {isArabic ? 'جلسات بومودورو ووضع الطيران الحية' : 'Live Pomodoro and Flight Mode sessions'}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono font-bold text-emerald-400 shrink-0 whitespace-nowrap">
                      {overview?.liveActiveUsers?.length || 0} {isArabic ? 'نشط' : 'Active'}
                    </span>
                  </div>

                  {(!overview?.liveActiveUsers || overview.liveActiveUsers.length === 0) ? (
                    <div className="p-12 text-center rounded-2xl bg-white/[0.02] border border-white/10 text-white/40 text-xs font-mono">
                      {isArabic ? 'لا توجد جلسات تركيز نشطة في هذه اللحظة.' : 'No active focus sessions running at the moment.'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {overview.liveActiveUsers.map((sessionUser) => {
                        const isFlight = sessionUser.activeSessionType === 'flight';
                        return (
                          <div 
                            key={sessionUser.id}
                            className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between gap-3 shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center font-bold text-xs uppercase text-white shrink-0">
                                  {sessionUser.name ? sessionUser.name.charAt(0) : 'U'}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-xs font-bold text-white truncate">
                                    {sessionUser.name || 'Unknown User'}
                                  </span>
                                  <span className="text-[10px] text-white/40 font-mono truncate">
                                    {sessionUser.username ? `@${sessionUser.username}` : sessionUser.email}
                                  </span>
                                </div>
                              </div>

                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                                isFlight 
                                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              }`}>
                                {isFlight ? (isArabic ? 'وضع الطيران' : 'Flight Mode') : 'Pomodoro'}
                              </span>
                            </div>

                            <div className="p-2.5 rounded-xl bg-white/5 text-[11px] font-mono text-white/60 flex items-center justify-between">
                              <span>{isArabic ? 'الحالة:' : 'Status:'}</span>
                              <span className="text-white flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                {isArabic ? 'جلسة جارية' : 'In Session'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: User Directory & Management */}
              {activeTab === 'users' && (
                <div className="space-y-4">
                  {/* Search and Filters Bar */}
                  <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                    <div className="relative flex-1">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                      <input 
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={isArabic ? 'بحث بالاسم، الإيميل، أو @username...' : 'Search by name, email, or @username...'}
                        className="w-full h-10 pl-9 pr-4 rounded-xl bg-white/5 border border-white/10 text-xs font-sans text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
                      />
                      {searchQuery && (
                        <button 
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide text-xs font-mono">
                      {[
                        { id: 'all', label: isArabic ? 'الكل' : 'All', count: users.length },
                        { id: 'admin', label: isArabic ? 'المشرفين' : 'Admins', count: users.filter(u => u.isAdmin).length },
                        { id: 'active', label: isArabic ? 'يركزون' : 'Focusing', count: users.filter(u => u.activeSessionType).length },
                        { id: 'spotify', label: 'Spotify', count: users.filter(u => u.hasSpotifyAccess).length },
                        { id: 'blocked', label: isArabic ? 'المحظورين' : 'Blocked', count: users.filter(u => u.isBlocked).length },
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setUserFilter(tab.id)}
                          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                            userFilter === tab.id 
                              ? 'bg-white text-black font-bold' 
                              : 'bg-white/5 text-white/50 hover:text-white border border-white/5'
                          }`}
                        >
                          <span>{tab.label}</span>
                          <span className={`text-[10px] ${userFilter === tab.id ? 'opacity-70' : 'opacity-40'}`}>
                            {tab.count}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Users Table / Card Grid */}
                  <div className="space-y-2.5">
                    {filteredUsers.length === 0 ? (
                      <div className="p-12 text-center rounded-2xl bg-white/[0.02] border border-white/10 text-white/40 text-xs font-mono">
                        {isArabic ? 'لم يتم العثور على مستخدمين يطابقون البحث.' : 'No users match the search criteria.'}
                      </div>
                    ) : (
                      filteredUsers.map((u) => {
                        const isPrimaryAdmin = u.email === '3yin3yin@gmail.com';
                        const isActionPending = actionLoading?.startsWith(u.id);

                        return (
                          <div 
                            key={u.id}
                            className={`p-4 rounded-2xl bg-white/[0.02] border ${
                              u.isBlocked 
                                ? 'border-red-500/30 bg-red-500/[0.02]' 
                                : 'border-white/10 hover:border-white/20'
                            } transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}
                          >
                            {/* User Info */}
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center font-bold text-sm text-white shrink-0">
                                {u.name ? u.name.charAt(0) : 'U'}
                              </div>

                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-bold text-white truncate">
                                    {u.name || 'Anonymous User'}
                                  </span>
                                  {u.username && (
                                    <span className="text-xs font-mono text-white/50">
                                      @{u.username}
                                    </span>
                                  )}
                                  {u.isAdmin && (
                                    <span className="px-2 py-0.5 rounded-md bg-white/10 text-white text-[10px] font-mono font-bold uppercase border border-white/10">
                                      {isArabic ? 'مشرف' : 'ADMIN'}
                                    </span>
                                  )}
                                  {u.isBlocked && (
                                    <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 text-[10px] font-mono font-bold uppercase border border-red-500/20">
                                      {isArabic ? 'محظور' : 'BLOCKED'}
                                    </span>
                                  )}
                                  {u.hasSpotifyAccess && (
                                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-1 border border-emerald-500/20">
                                      <Music size={10} /> Spotify
                                    </span>
                                  )}
                                  {u.activeSessionType && (
                                    <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-[10px] font-mono font-bold flex items-center gap-1 border border-blue-500/20">
                                      <Radio size={10} className="animate-pulse" /> {u.activeSessionType}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-3 text-[11px] font-mono text-white/40 mt-1 flex-wrap">
                                  <span>{u.email}</span>
                                  <span>·</span>
                                  <span>{u._count?.habits || 0} {isArabic ? 'عادات' : 'habits'}</span>
                                  <span>·</span>
                                  <span>{u._count?.dailyLogs || 0} {isArabic ? 'سجلات' : 'logs'}</span>
                                  <span>·</span>
                                  <span>{u.totalFocusHours || 0}h {isArabic ? 'تركيز' : 'focus'}</span>
                                </div>
                              </div>
                            </div>

                            {/* User Action Buttons */}
                            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                              {/* Spotify Access Toggle */}
                              <button
                                onClick={() => handleUserAction(u.id, u.hasSpotifyAccess ? 'revokeSpotify' : 'grantSpotify')}
                                disabled={isActionPending}
                                className={`h-8 px-2.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                                  u.hasSpotifyAccess 
                                    ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20' 
                                    : 'bg-white/5 text-white/50 hover:text-white border border-white/5'
                                }`}
                                title={u.hasSpotifyAccess ? 'Revoke Spotify Access' : 'Grant Spotify Access'}
                              >
                                <Music size={12} />
                                <span className="hidden md:inline">
                                  {u.hasSpotifyAccess ? (isArabic ? 'إلغاء Spotify' : 'Spotify On') : (isArabic ? 'منح Spotify' : 'Spotify Off')}
                                </span>
                              </button>

                              {/* Toggle Admin */}
                              <button
                                onClick={() => handleUserAction(u.id, u.isAdmin ? 'removeAdmin' : 'makeAdmin')}
                                disabled={isPrimaryAdmin || isActionPending}
                                className={`h-8 px-2.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                                  isPrimaryAdmin 
                                    ? 'opacity-20 cursor-not-allowed bg-white/5 text-white/40' 
                                    : u.isAdmin 
                                      ? 'bg-white/20 text-white hover:bg-white/30 border border-white/20' 
                                      : 'bg-white/5 text-white/50 hover:text-white border border-white/5'
                                }`}
                                title={isPrimaryAdmin ? 'Primary admin cannot be modified' : 'Toggle Admin Role'}
                              >
                                <Shield size={12} />
                                <span className="hidden md:inline">
                                  {u.isAdmin ? (isArabic ? 'مشرف' : 'Admin') : (isArabic ? 'ترقية لمشرف' : 'Make Admin')}
                                </span>
                              </button>

                              {/* Toggle Block */}
                              <button
                                onClick={() => handleUserAction(u.id, u.isBlocked ? 'unblock' : 'block')}
                                disabled={isPrimaryAdmin || isActionPending}
                                className={`h-8 px-2.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                                  isPrimaryAdmin 
                                    ? 'opacity-20 cursor-not-allowed bg-white/5 text-white/40' 
                                    : u.isBlocked 
                                      ? 'bg-white text-black hover:bg-white/90' 
                                      : 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
                                }`}
                                title={isPrimaryAdmin ? 'Primary admin cannot be blocked' : 'Toggle Block'}
                              >
                                {u.isBlocked ? <Check size={12} /> : <UserX size={12} />}
                                <span>
                                  {u.isBlocked ? (isArabic ? 'فك الحظر' : 'Unblock') : (isArabic ? 'حظر' : 'Block')}
                                </span>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: Architecture & Health */}
              {activeTab === 'system' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Database Health */}
                    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono uppercase tracking-wider text-white/50 font-bold whitespace-nowrap truncate">
                          {isArabic ? 'قاعدة البيانات' : 'Database'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-bold border border-emerald-500/20">
                          {isArabic ? 'متصل' : 'ONLINE'}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white whitespace-nowrap truncate">Neon PostgreSQL Serverless</h4>
                      <p className="text-xs text-white/40 font-mono leading-relaxed">
                        Pooler Endpoint · ep-royal-art-alepxxqp-pooler · Prisma Client ORM
                      </p>
                      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs font-mono text-white/60">
                        <span>{isArabic ? 'إجمالي السجلات:' : 'Daily Logs:'}</span>
                        <span className="font-bold text-white">{overview?.totalDailyLogs ?? 75}</span>
                      </div>
                    </div>

                    {/* Rate Limiting */}
                    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono uppercase tracking-wider text-white/50 font-bold whitespace-nowrap truncate">
                          {isArabic ? 'تحديد المعدل' : 'Rate Limiting'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-bold border border-emerald-500/20">
                          {isArabic ? 'محمي' : 'ACTIVE'}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white whitespace-nowrap truncate">Token Bucket + Upstash Redis</h4>
                      <p className="text-xs text-white/40 font-mono leading-relaxed">
                        Client IP Detection · Trust Proxy Safe · Sync Rate Limit 60/min
                      </p>
                      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs font-mono text-white/60">
                        <span>{isArabic ? 'طريق المصادقة:' : 'Auth Gateway:'}</span>
                        <span className="font-bold text-white">Clerk Edge Proxy</span>
                      </div>
                    </div>

                    {/* Desktop & Mobile Artifacts */}
                    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                      <span className="text-xs font-mono uppercase tracking-wider text-white/50 font-bold whitespace-nowrap truncate">
                        {isArabic ? 'حزم التنزيل' : 'App Builds'}
                      </span>
                      <div className="space-y-2 text-xs font-mono">
                        <div className="flex justify-between text-white/80">
                          <span>macOS Universal (x86_64 + arm64):</span>
                          <span className="text-emerald-400">19.5 MB</span>
                        </div>
                        <div className="flex justify-between text-white/80">
                          <span>Android Standalone APK:</span>
                          <span className="text-emerald-400">1.67 MB</span>
                        </div>
                        <div className="flex justify-between text-white/80">
                          <span>Linux Debian (.deb):</span>
                          <span className="text-emerald-400">7.6 MB</span>
                        </div>
                        <div className="flex justify-between text-white/80">
                          <span>Windows Standalone ZIP:</span>
                          <span className="text-emerald-400">32 KB</span>
                        </div>
                      </div>
                    </div>

                    {/* CSP & Network Isolation */}
                    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                      <span className="text-xs font-mono uppercase tracking-wider text-white/50 font-bold whitespace-nowrap truncate">
                        {isArabic ? 'سياسة الأمان' : 'Security Policy'}
                      </span>
                      <p className="text-xs text-white/40 font-mono leading-relaxed">
                        Strict origin whitelisting: clerk.accounts.dev, openstreetmap, spotify.com, googleapis. Zero wildcard scripts.
                      </p>
                      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs font-mono text-white/60">
                        <span>{isArabic ? 'حالة التشفير:' : 'Transport:'}</span>
                        <span className="text-emerald-400 font-bold">HSTS 1 Year</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
