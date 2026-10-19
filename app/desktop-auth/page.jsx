"use client";
import React, { useEffect, useState } from 'react';
import { useUser, SignIn } from '@clerk/nextjs';
import { dark } from '@clerk/themes';

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
        throw new Error('Failed to generate desktop authentication token');
      }

      const data = await res.json();
      if (!data.token) {
        throw new Error('Invalid token response from server');
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
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 selection:bg-white/20 font-sans antialiased">
      
      {/* Official App Logo */}
      <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-2xl mb-5 border border-white/10 bg-black flex items-center justify-center">
        <img src="/logo.png" alt="bokra" className="w-full h-full object-cover" />
      </div>

      {/* Main Container */}
      <div className="w-full max-w-[420px] flex flex-col items-center">
        
        {status === 'initializing' && (
          <div className="w-full bg-[#121214] border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center">
            <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4" />
            <h2 className="text-base font-semibold text-white mb-1">Verifying Session</h2>
            <p className="text-xs text-white/40">Checking your account status...</p>
          </div>
        )}

        {status === 'login_required' && (
          <div className="w-full flex flex-col items-center">
            <div className="mb-4 text-center">
              <h1 className="text-xl font-bold tracking-tight text-white mb-1">
                Sign in to bokra
              </h1>
              <p className="text-xs text-white/50">
                Connect your account to bokra for Mac
              </p>
            </div>

            <div className="w-full">
              <SignIn
                routing="hash"
                appearance={{
                  baseTheme: dark,
                  variables: {
                    colorPrimary: '#FFFFFF',
                    colorBackground: '#121214',
                    colorInputBackground: '#1C1C1E',
                    colorInputText: '#FFFFFF',
                    colorText: '#FFFFFF',
                    colorTextSecondary: 'rgba(255, 255, 255, 0.55)',
                    borderRadius: '16px',
                  },
                  elements: {
                    rootBox: 'w-full',
                    card: 'bg-[#121214] border border-white/10 shadow-2xl rounded-3xl p-6 w-full',
                    headerTitle: 'text-white text-lg font-bold tracking-tight',
                    headerSubtitle: 'text-white/50 text-xs',
                    socialButtonsBlockButton: 'bg-[#1C1C1E] border border-white/10 hover:bg-white/10 text-white rounded-2xl transition-all h-11',
                    socialButtonsBlockButtonText: 'text-white font-medium text-xs',
                    dividerLine: 'bg-white/10',
                    dividerText: 'text-white/40 text-xs uppercase tracking-widest',
                    formFieldLabel: 'text-white/70 text-xs font-medium',
                    formFieldInput: 'bg-[#1C1C1E] border border-white/10 rounded-2xl text-white text-sm h-11 px-4 focus:border-white/30 transition-colors',
                    formButtonPrimary: 'bg-white hover:bg-white/90 text-black font-semibold text-sm rounded-2xl h-11 transition-all active:scale-[0.98]',
                    footerActionLink: 'text-white font-medium hover:underline',
                    footer: 'text-white/40 text-xs',
                    identityPreview: 'bg-[#1C1C1E] border border-white/10 rounded-2xl',
                  }
                }}
              />
            </div>
          </div>
        )}

        {status === 'authenticating' && (
          <div className="w-full bg-[#121214] border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center">
            <div className="w-7 h-7 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4" />
            <h2 className="text-base font-semibold text-white mb-1">Connecting to bokra for Mac</h2>
            <p className="text-xs text-white/40">Redirecting automatically in a moment...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="w-full bg-[#121214] border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-lg mb-4 font-bold border border-emerald-500/20">
              ✓
            </div>
            <h2 className="text-lg font-bold text-white mb-1">
              Successfully Signed In
            </h2>
            <p className="text-xs text-white/55 mb-6 max-w-xs leading-relaxed">
              Your account has been linked to the desktop app. You can now close this tab and return to bokra.
            </p>

            <a
              href={`http://127.0.0.1:${port}/callback?token=${encodeURIComponent(tokenData?.token || '')}&user=${encodeURIComponent(JSON.stringify(tokenData?.user || {}))}`}
              className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-white/90 text-black font-semibold text-sm transition-all mb-3 text-center active:scale-[0.98]"
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
          <div className="w-full bg-[#121214] border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center text-lg mb-4 font-bold border border-red-500/20">
              !
            </div>
            <h2 className="text-base font-bold text-white mb-1">Connection Failed</h2>
            <p className="text-xs text-red-400/80 mb-6">{errorMessage}</p>
            <button
              onClick={handleCompleteAuth}
              className="w-full py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm transition-all active:scale-[0.98]"
            >
              Try Again
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
