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
      
      {/* Scoped CSS overrides for Clerk components to guarantee pure dark theme & remove duplicate headers */}
      <style dangerouslySetInnerHTML={{ __html: `
        .cl-card {
          background: transparent !important;
          box-shadow: none !important;
          border: none !important;
          padding: 0 !important;
          width: 100% !important;
        }
        .cl-rootBox {
          width: 100% !important;
        }
        .cl-header {
          display: none !important;
        }
        .cl-socialButtonsBlockButton {
          background-color: #202023 !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          color: #FFFFFF !important;
          border-radius: 14px !important;
          height: 44px !important;
          transition: all 0.2s ease !important;
        }
        .cl-socialButtonsBlockButton:hover {
          background-color: #28282C !important;
          border-color: rgba(255, 255, 255, 0.2) !important;
        }
        .cl-socialButtonsBlockButtonText {
          color: #FFFFFF !important;
          font-size: 13px !important;
          font-weight: 500 !important;
        }
        .cl-dividerLine {
          background-color: rgba(255, 255, 255, 0.1) !important;
        }
        .cl-dividerText {
          color: rgba(255, 255, 255, 0.4) !important;
          font-size: 11px !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
        }
        .cl-formFieldLabel {
          color: rgba(255, 255, 255, 0.7) !important;
          font-size: 12px !important;
          margin-bottom: 6px !important;
        }
        .cl-formFieldInput {
          background-color: #202023 !important;
          border: 1px solid rgba(255, 255, 255, 0.12) !important;
          color: #FFFFFF !important;
          border-radius: 14px !important;
          height: 44px !important;
          font-size: 14px !important;
          padding: 0 14px !important;
          transition: all 0.2s ease !important;
        }
        .cl-formFieldInput:focus {
          border-color: rgba(255, 255, 255, 0.35) !important;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.2) !important;
          outline: none !important;
        }
        .cl-formFieldInput::placeholder {
          color: rgba(255, 255, 255, 0.3) !important;
        }
        .cl-formButtonPrimary {
          background-color: #FFFFFF !important;
          color: #000000 !important;
          border-radius: 14px !important;
          height: 44px !important;
          font-weight: 600 !important;
          font-size: 14px !important;
          border: none !important;
          transition: all 0.15s ease !important;
          margin-top: 10px !important;
        }
        .cl-formButtonPrimary:hover {
          background-color: rgba(255, 255, 255, 0.88) !important;
        }
        .cl-formButtonPrimary:active {
          transform: scale(0.98) !important;
        }
        .cl-footerActionText {
          color: rgba(255, 255, 255, 0.5) !important;
          font-size: 12px !important;
        }
        .cl-footerActionLink {
          color: #FFFFFF !important;
          font-weight: 600 !important;
          font-size: 12px !important;
        }
        .cl-footerActionLink:hover {
          text-decoration: underline !important;
        }
        .cl-footer {
          background: transparent !important;
          border: none !important;
          padding-top: 14px !important;
        }
        .cl-identityPreview {
          background-color: #202023 !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 14px !important;
        }
        .cl-identityPreviewText {
          color: #FFFFFF !important;
        }
        .cl-identityPreviewEditButton {
          color: rgba(255, 255, 255, 0.6) !important;
        }
        .cl-otpCodeFieldInput {
          background-color: #202023 !important;
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
          color: #FFFFFF !important;
          border-radius: 12px !important;
        }
      ` }} />

      {/* Unified Single Card */}
      <div className="w-full max-w-[400px] bg-[#141416] border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col items-center backdrop-blur-xl">
        
        {/* Official App Logo */}
        <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-2xl mb-4 border border-white/10 bg-black flex items-center justify-center">
          <img src="/logo.png" alt="bokra" className="w-full h-full object-cover" />
        </div>

        {/* Brand Header */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold tracking-tight text-white mb-1">
            Sign In to bokra
          </h1>
          <p className="text-xs text-white/50 tracking-wide font-medium">
            Habit & Focus Companion
          </p>
        </div>

        {/* State 1: Verifying Session */}
        {status === 'initializing' && (
          <div className="py-8 flex flex-col items-center text-center">
            <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4" />
            <h2 className="text-sm font-semibold text-white mb-1">Verifying Session</h2>
            <p className="text-xs text-white/40">Checking your account status...</p>
          </div>
        )}

        {/* State 2: Login Form */}
        {status === 'login_required' && (
          <div className="w-full">
            <SignIn
              routing="hash"
              appearance={{
                baseTheme: dark,
              }}
            />
          </div>
        )}

        {/* State 3: Authenticating / Redirecting */}
        {status === 'authenticating' && (
          <div className="py-6 flex flex-col items-center text-center w-full">
            <div className="w-7 h-7 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4" />
            <h2 className="text-base font-semibold text-white mb-1">Connecting to bokra for Mac</h2>
            <p className="text-xs text-white/40">Redirecting automatically in a moment...</p>
          </div>
        )}

        {/* State 4: Success */}
        {status === 'success' && (
          <div className="py-2 flex flex-col items-center text-center w-full">
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

        {/* State 5: Error */}
        {status === 'error' && (
          <div className="py-2 flex flex-col items-center text-center w-full">
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
