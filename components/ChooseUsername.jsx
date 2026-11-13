"use client";

import React, { useState, useEffect } from 'react';
import { useUser, useAuth } from './AuthBridge';
import { apiFetch } from '../lib/api';
import AvatarIcon, { AVATAR_OPTIONS } from './AvatarIcon';
import { Loader2, ArrowRight, AlertCircle, Check, Sparkles } from 'lucide-react';

export default function ChooseUsername({ onComplete }) {
  const { user } = useUser();
  const { signOut, getToken } = useAuth();
  const [value, setValue] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(true);

  // Auto-check on mount if user already has a username in database
  useEffect(() => {
    let isMounted = true;
    apiFetch('/api/user/username')
      .then((res) => (res.ok ? res.json() : null))
      .then(async (data) => {
        if (!isMounted) return;
        if (data?.username) {
          if (typeof window !== 'undefined') {
            try {
              const savedUser = localStorage.getItem('bokra_desktop_user');
              const parsed = savedUser ? JSON.parse(savedUser) : {};
              parsed.username = data.username;
              if (data.name) parsed.name = data.name;
              if (data.avatar) {
                parsed.avatar = data.avatar;
                localStorage.setItem('daybase_avatar_v1', data.avatar);
              }
              localStorage.setItem('bokra_desktop_user', JSON.stringify(parsed));
            } catch (_) {}
          }
          if (typeof onComplete === 'function') {
            onComplete(data.username);
            return;
          }
          if (typeof window !== 'undefined') {
            window.location.reload();
          }
        } else {
          setChecking(false);
        }
      })
      .catch(() => {
        if (isMounted) setChecking(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user, onComplete]);

  const clean = value.trim().toLowerCase();
  const tooShort = clean.length < 4;
  const onlyNumbers = /^\d+$/.test(clean);
  const validPattern = /^[a-z0-9_.]+$/.test(clean);
  const hasGooglePhoto = typeof user?.imageUrl === 'string' && (user.imageUrl.startsWith('http://') || user.imageUrl.startsWith('https://'));
  const effectiveAvatar = selectedAvatar || (hasGooglePhoto ? user.imageUrl : null);
  const hasAvatar = Boolean(effectiveAvatar);

  // Mandatory: Must have valid username AND (chosen avatar OR Google photo)
  const isDisabled = tooShort || onlyNumbers || !validPattern || !hasAvatar || saving;

  async function save(e) {
    if (e) e.preventDefault();
    if (isDisabled) return;
    setSaving(true);
    setError(null);

    try {
      let token = null;
      if (typeof getToken === 'function') {
        try {
          token = await getToken();
        } catch (_) {}
      }

      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await apiFetch('/api/user/username', {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          username: clean,
          avatar: effectiveAvatar 
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error || 'Failed to update username');
        setSaving(false);
        return;
      }

      const confirmedUsername = data?.username || clean;

      // Update storage immediately
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('daybase_avatar_v1', selectedAvatar);
          const savedUser = localStorage.getItem('bokra_desktop_user');
          if (savedUser) {
            const parsed = JSON.parse(savedUser);
            parsed.username = confirmedUsername;
            parsed.avatar = selectedAvatar;
            localStorage.setItem('bokra_desktop_user', JSON.stringify(parsed));
          }
          const sessionUser = localStorage.getItem('bokra_session_user');
          if (sessionUser) {
            const parsed = JSON.parse(sessionUser);
            parsed.username = confirmedUsername;
            parsed.imageUrl = selectedAvatar;
            localStorage.setItem('bokra_session_user', JSON.stringify(parsed));
          }
        } catch (_) {}
      }

      // Also background sync avatar
      apiFetch('/api/sync', {
        method: 'POST',
        body: JSON.stringify({ avatar: selectedAvatar, updatedAt: Date.now() })
      }).catch(() => {});

      if (typeof onComplete === 'function') {
        onComplete(confirmedUsername);
        return;
      }

      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (err) {
      setError(err?.message || 'Network error, please try again.');
      setSaving(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-[#000000] text-white flex flex-col items-center justify-center p-6 select-none font-sans">
        <Loader2 size={24} className="animate-spin text-white/50" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col items-center justify-center p-6 select-none font-sans relative overflow-hidden">
      {/* Subtle Monochrome Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-white/[0.03] blur-[140px] rounded-full pointer-events-none" />

      <div className="w-full max-w-[420px] flex flex-col items-center text-center relative z-10">
        {/* Official bokra Logo */}
        <img
          src="/logo-transparent.png"
          alt="bokra"
          className="h-12 w-auto object-contain mb-4 select-none drop-shadow-xl"
        />

        {/* Title & Subtitle (English only) */}
        <h1 className="text-2xl font-bold tracking-tight text-white mb-1.5">
          Complete Your Profile
        </h1>
        <p className="text-xs text-white/50 mb-6 max-w-xs leading-relaxed font-medium">
          Choose your unique username and profile avatar to continue.
        </p>

        {/* Setup Form */}
        <form onSubmit={save} className="w-full flex flex-col gap-6">
          
          {/* Step 1: Avatar Selection (Mandatory) */}
          <div className="w-full p-5 rounded-3xl bg-[#0d0d0f] border border-white/10 flex flex-col items-center">
            <div className="flex items-center justify-between w-full mb-3 px-1">
              <span className="text-xs font-semibold text-white tracking-wide">
                1. Choose Profile Avatar
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${hasAvatar ? 'bg-white/10 text-white' : 'bg-white/5 text-white/40'}`}>
                {hasAvatar ? 'Selected' : 'Required'}
              </span>
            </div>

            {/* Selected Avatar Large Preview */}
            <div className="w-16 h-16 rounded-2xl bg-white/[0.06] border border-white/20 flex items-center justify-center mb-4 transition-all duration-300 overflow-hidden">
              {effectiveAvatar && (effectiveAvatar.startsWith('http://') || effectiveAvatar.startsWith('https://')) ? (
                <img 
                  src={effectiveAvatar} 
                  alt="Google Avatar" 
                  className="w-full h-full object-cover rounded-2xl" 
                  referrerPolicy="no-referrer" 
                />
              ) : effectiveAvatar ? (
                <div className="text-white scale-110 animate-in zoom-in-75 duration-200">
                  <AvatarIcon name={effectiveAvatar} size={32} />
                </div>
              ) : (
                <span className="text-[10px] font-mono text-white/30 text-center px-1">
                  Pick Below
                </span>
              )}
            </div>

            {/* Grid of ALL Avatars */}
            <div className="grid grid-cols-8 gap-2 w-full max-h-[180px] overflow-y-auto pr-1">
              {hasGooglePhoto && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAvatar(user.imageUrl);
                    if (error) setError(null);
                  }}
                  className={`aspect-square rounded-xl flex items-center justify-center overflow-hidden transition-all duration-150 cursor-pointer active:scale-90 border ${
                    effectiveAvatar === user.imageUrl
                      ? 'border-white shadow-[0_0_15px_rgba(255,255,255,0.4)] scale-105'
                      : 'border-white/10 hover:border-white/30 opacity-70 hover:opacity-100'
                  }`}
                  title="Google Profile Photo"
                >
                  <img src={user.imageUrl} alt="Google" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </button>
              )}
              {AVATAR_OPTIONS.map((av) => {
                const isSelected = effectiveAvatar === av;
                return (
                  <button
                    key={av}
                    type="button"
                    onClick={() => {
                      setSelectedAvatar(av);
                      if (error) setError(null);
                    }}
                    className={`aspect-square rounded-xl flex items-center justify-center transition-all duration-150 cursor-pointer active:scale-90 ${
                      isSelected
                        ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.4)] scale-105'
                        : 'bg-white/[0.04] text-white/50 hover:text-white hover:bg-white/[0.08] border border-white/5 hover:border-white/15'
                    }`}
                    title={av}
                  >
                    <AvatarIcon name={av} size={18} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Username Input (Mandatory) */}
          <div className="w-full p-5 rounded-3xl bg-[#0d0d0f] border border-white/10 flex flex-col text-left">
            <div className="flex items-center justify-between w-full mb-3 px-1">
              <span className="text-xs font-semibold text-white tracking-wide">
                2. Choose Username
              </span>
              <span className="text-[10px] font-mono text-white/40">
                {clean.length}/30
              </span>
            </div>

            <div className="relative flex items-center">
              <span className="absolute left-4 text-white/30 font-mono text-sm font-bold select-none pointer-events-none">
                @
              </span>
              <input
                type="text"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="username"
                autoFocus
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={30}
                className="w-full bg-black border border-white/15 focus:border-white/50 pl-9 pr-4 py-3 rounded-2xl text-white text-sm font-mono font-medium outline-none transition-all placeholder:text-white/20"
              />
            </div>

            <p className="mt-2 text-[11px] text-white/40 px-1 font-medium">
              Letters, numbers, underscores, and dots only (min. 4 characters).
            </p>

            {/* Error Message */}
            {error && (
              <div className="mt-3 p-3 rounded-xl bg-white/[0.04] border border-white/20 text-white text-xs flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0 text-white/80" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Save Button */}
          <button
            type="submit"
            disabled={isDisabled}
            className={`w-full py-4 rounded-2xl font-bold text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] ${
              isDisabled
                ? 'bg-white/10 text-white/30 cursor-not-allowed border border-white/5'
                : 'bg-white text-black hover:bg-white/90 shadow-[0_0_25px_rgba(255,255,255,0.2)] cursor-pointer'
            }`}
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin text-black" />
                <span>Creating Profile...</span>
              </>
            ) : (
              <>
                <span>Continue to Dashboard</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Optional Sign Out */}
        {signOut && (
          <button
            type="button"
            onClick={() => signOut()}
            className="mt-6 text-xs text-white/30 hover:text-white/60 transition-colors cursor-pointer py-1 font-medium"
          >
            Sign out
          </button>
        )}
      </div>
    </div>
  );
}
