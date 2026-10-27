"use client";

import React, { useState } from 'react';
import { useUser, useAuth } from './AuthBridge';
import { apiFetch } from '../lib/api';
import { Loader2, ArrowRight, AlertCircle } from 'lucide-react';

export default function ChooseUsername() {
  const { user } = useUser();
  const { signOut, getToken } = useAuth();
  const [value, setValue] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const clean = value.trim().toLowerCase();
  const tooShort = clean.length < 4;
  const onlyNumbers = /^\d+$/.test(clean);
  const isDisabled = tooShort || onlyNumbers || saving;

  async function save(e) {
    if (e) e.preventDefault();
    if (tooShort || onlyNumbers || saving) return;
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
        body: JSON.stringify({ username: clean })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error || 'Failed to update username');
        setSaving(false);
        return;
      }

      try {
        await user?.reload();
      } catch (_) {}

      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (err) {
      setError(err?.message || 'Network error, please try again.');
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col items-center justify-center p-6 select-none font-sans relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute w-[380px] h-[380px] rounded-full bg-white/[0.03] blur-3xl pointer-events-none -top-10" />

      <div className="w-full max-w-sm flex flex-col items-center text-center relative z-10">
        {/* Official bokra Logo */}
        <img
          src="/logo-transparent.png"
          alt="bokra"
          className="h-14 w-auto object-contain mb-5 select-none drop-shadow-2xl"
        />

        {/* Title & Subtitle */}
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2">
          Choose Username
        </h1>
        <p className="text-xs sm:text-sm text-white/50 mb-7 max-w-xs leading-relaxed">
          Pick a unique username to connect with friends and track progress together.
        </p>

        {/* Username Form */}
        <form onSubmit={save} className="w-full flex flex-col gap-4">
          <div className="flex flex-col gap-2 text-start">
            <div className="relative flex items-center">
              <span className="absolute left-4 text-white/30 font-mono text-base font-bold select-none pointer-events-none">
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
                className="w-full bg-[#0c0c0e] border border-white/15 focus:border-white/40 pl-9 pr-4 py-3.5 rounded-2xl text-white text-base font-mono font-bold outline-none transition-all placeholder:text-white/20"
              />
            </div>

            {/* Guidance line */}
            <div className="flex items-center justify-between px-1 text-[11px] text-white/40 font-medium">
              <span>At least 4 characters, cannot be numbers only</span>
              <span className="font-mono">{clean.length}/30</span>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-200 text-xs flex items-start gap-2.5 animate-fadeIn text-start">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-400" />
                <span className="leading-snug">{error}</span>
              </div>
            )}
          </div>

          {/* Save Button */}
          <button
            type="submit"
            disabled={isDisabled}
            className={`w-full py-3.5 rounded-2xl font-black text-sm transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] ${
              isDisabled
                ? 'bg-white/10 text-white/30 cursor-not-allowed border border-white/5'
                : 'bg-white text-black hover:bg-white/90 shadow-lg cursor-pointer'
            }`}
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <span>Save Username</span>
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
            className="mt-6 text-xs text-white/30 hover:text-white/60 transition-colors cursor-pointer py-1"
          >
            Sign out
          </button>
        )}
      </div>
    </div>
  );
}
