"use client";
import React, { useEffect, useState } from 'react';
import { useUser, SignIn } from '@clerk/nextjs';

export default function DesktopAuthPage() {
  const { isSignedIn, isLoaded, user } = useUser();
  const [port, setPort] = useState(28282);
  const [status, setStatus] = useState('initializing'); // initializing, login_required, authenticating, success, error
  const [tokenData, setTokenData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const portParam = params.get('port');
      if (portParam) {
        const parsed = parseInt(portParam, 10);
        if (!isNaN(parsed) && parsed > 1024 && parsed < 65535) {
          setPort(parsed);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn && user) {
      handleCompleteAuth();
    } else {
      setStatus('login_required');
    }
  }, [isSignedIn, isLoaded, user, port]);

  const handleCompleteAuth = async () => {
    setStatus('authenticating');
    try {
      const res = await fetch('/api/auth/desktop-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        throw new Error('Failed to generate desktop token');
      }

      const data = await res.json();
      if (!data.token) {
        throw new Error('Invalid token response');
      }

      setTokenData(data);
      setStatus('success');

      const localCallbackUrl = `http://127.0.0.1:${port}/callback?token=${encodeURIComponent(data.token)}&user=${encodeURIComponent(JSON.stringify(data.user))}`;
      
      try {
        fetch(localCallbackUrl, { mode: 'no-cors' }).catch(() => {});
      } catch (e) {}

      setTimeout(() => {
        window.location.href = localCallbackUrl;
      }, 500);

    } catch (err) {
      console.error('Desktop Auth Error:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Error communicating with bokra desktop');
    }
  };

  const copyToken = () => {
    if (tokenData?.token) {
      navigator.clipboard.writeText(tokenData.token);
      alert('Key copied to clipboard! You can paste it into the bokra app.');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 selection:bg-white/20 font-sans">
      <div className="w-full max-w-md bg-[#121214] border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center backdrop-blur-xl">
        
        {/* Official Logo */}
        <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-2xl mb-5 border border-white/10 bg-black flex items-center justify-center">
          <img src="/logo.png" alt="bokra logo" className="w-full h-full object-cover" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
          Sign In to bokra
        </h1>
        <p className="text-xs text-white/40 mb-6 font-medium tracking-wide">
          macOS Desktop Authentication
        </p>

        {/* Content States */}
        {status === 'initializing' && (
          <div className="py-8 flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <span className="text-xs text-white/40 font-medium">Verifying session...</span>
          </div>
        )}

        {status === 'login_required' && (
          <div className="w-full flex flex-col items-center">
            <p className="text-xs text-white/60 mb-5 max-w-xs leading-relaxed">
              Sign in with your account to synchronize your habits and progress with bokra for Mac:
            </p>
            <div className="w-full overflow-hidden flex justify-center scale-95">
              <SignIn routing="hash" />
            </div>
          </div>
        )}

        {status === 'authenticating' && (
          <div className="py-8 flex flex-col items-center gap-3">
            <div className="w-7 h-7 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <span className="text-sm font-semibold text-white">Connecting to bokra for Mac...</span>
            <span className="text-xs text-white/40">Your browser will redirect automatically.</span>
          </div>
        )}

        {status === 'success' && (
          <div className="py-3 flex flex-col items-center w-full">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-lg mb-4 font-bold border border-emerald-500/20">
              ✓
            </div>
            <h2 className="text-lg font-bold text-white mb-1">
              Successfully Signed In
            </h2>
            <p className="text-xs text-white/60 mb-6 max-w-xs leading-relaxed">
              Your account has been linked to the desktop app. You can now close this tab and return to bokra.
            </p>

            <a
              href={`http://127.0.0.1:${port}/callback?token=${encodeURIComponent(tokenData?.token || '')}&user=${encodeURIComponent(JSON.stringify(tokenData?.user || {}))}`}
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-white/90 text-black font-semibold text-sm transition-all mb-3 text-center active:scale-[0.98]"
            >
              Return to bokra
            </a>

            <button
              onClick={copyToken}
              className="text-xs text-white/40 hover:text-white transition-colors cursor-pointer py-1"
            >
              Copy manual key
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="py-4 flex flex-col items-center w-full">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center text-lg mb-4 font-bold border border-red-500/20">
              !
            </div>
            <h2 className="text-base font-bold text-white mb-1">Connection Failed</h2>
            <p className="text-xs text-red-400/80 mb-6">{errorMessage}</p>
            <button
              onClick={handleCompleteAuth}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm transition-all active:scale-[0.98]"
            >
              Try Again
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
