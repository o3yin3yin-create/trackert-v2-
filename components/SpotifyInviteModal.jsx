'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Radio, Check, AlertCircle, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';

export default function SpotifyInviteModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  isSignedIn = false
}) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const handleRedeem = async (e) => {
    e?.preventDefault?.();
    const clean = code.trim().toUpperCase();
    if (!clean) {
      setError('Please enter a valid invite code.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await apiFetch('/api/spotify/redeem-code', {
        method: 'POST',
        body: JSON.stringify({ code: clean })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || 'Invalid or already used invite code.');
        setLoading(false);
        return;
      }

      setSuccessMsg(data.message || 'Spotify beta access unlocked successfully.');
      onSuccess?.();

      setTimeout(() => {
        onClose();
        const loginUrl = (typeof window !== 'undefined' && (window.__TAURI_INTERNALS__ || window.location.protocol === 'tauri:'))
          ? 'https://bokra101.vercel.app/api/spotify/login'
          : '/api/spotify/login';
        window.location.href = loginUrl;
      }, 900);
    } catch (err) {
      setError('Connection failed. Please check your network and try again.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-[400px] bg-[#121214] border border-white/10 rounded-[28px] p-6 text-white shadow-2xl select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/5 hover:bg-white/15 text-white/50 hover:text-white transition-all cursor-pointer active:scale-95"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        {/* Header Icon & Title */}
        <div className="flex flex-col items-center text-center gap-2.5 pt-2 pb-5">
          <div className="w-14 h-14 rounded-2xl bg-[#1DB954]/15 border border-[#1DB954]/25 flex items-center justify-center text-[#1DB954] shadow-lg shadow-[#1DB954]/10 mb-1">
            <Radio size={28} strokeWidth={2.4} />
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono font-bold text-white/60 tracking-wider uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1DB954] animate-pulse" />
            <span>Private Beta</span>
          </div>

          <h3 className="text-lg font-black text-white tracking-tight">
            Spotify Early Access
          </h3>

          <p className="text-xs text-white/50 leading-relaxed max-w-[320px]">
            Spotify player integration is currently in invite-only beta. Enter a single-use invite code to permanently unlock it for your account.
          </p>
        </div>

        {/* Content Body */}
        {!isSignedIn ? (
          <div className="flex flex-col gap-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-center text-xs text-white/60">
              Please sign in to your account first so the invite code binds permanently to your profile.
            </div>
            <Link
              href="/sign-in"
              onClick={onClose}
              className="w-full h-12 rounded-2xl bg-white text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center hover:bg-white/90 active:scale-[0.98] transition-all shadow-md"
            >
              Sign In to Continue
            </Link>
          </div>
        ) : (
          <form onSubmit={handleRedeem} className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider px-1">
                Invite Code
              </label>
              <input
                type="text"
                autoFocus
                disabled={loading || Boolean(successMsg)}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setError('');
                }}
                placeholder="BOKRA-XXXX-XXXX"
                className="w-full h-13 px-4 rounded-2xl bg-white/5 border border-white/15 focus:border-white/40 focus:bg-white/10 text-center font-mono font-bold text-sm tracking-widest text-white placeholder:text-white/20 outline-none transition-all"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                <Check size={14} className="shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !code.trim() || Boolean(successMsg)}
              className="w-full h-12 rounded-2xl bg-white text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-md mt-1"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                'Unlock & Connect'
              )}
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
