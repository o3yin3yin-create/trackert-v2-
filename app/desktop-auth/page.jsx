"use client";
import React, { useEffect, useState } from 'react';
import { useUser, SignIn } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { clerkAppearance } from '@/lib/clerkTheme';

export default function DesktopAuthPage() {
  const { isSignedIn, isLoaded, user } = useUser();
  const [port, setPort] = useState(28282);
  const [status, setStatus] = useState('login_required'); // login_required, authenticating, success, error
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

  // When user is signed in (or completes login), automatically complete authentication and link desktop app
  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      handleCompleteAuth();
    }
  }, [isLoaded, isSignedIn, user, port]);

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
      
      {/* Precision Scoped CSS overrides for Clerk to eliminate double-cards and enforce pure dark Apple identity */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* 1. Strip ALL inner cards, borders, backgrounds, and shadows from Clerk */
        .cl-rootBox,
        .cl-cardBox,
        .cl-card,
        .cl-main,
        .cl-signIn-start,
        .cl-pageScrollBox,
        .cl-contentBox {
          background: transparent !important;
          background-color: transparent !important;
          box-shadow: none !important;
          border: none !important;
          padding: 0 !important;
          margin: 0 !important;
          width: 100% !important;
        }

        /* 2. Hide duplicate Clerk header */
        .cl-header {
          display: none !important;
        }

        /* 3. Social Buttons (Apple & Google) - Strictly 14px Squircle Apple Curves on all 4 corners */
        :root {
          --clerk-border-radius: 14px !important;
          --cl-border-radius: 14px !important;
        }

        .cl-socialButtonsRoot {
          width: 100% !important;
          margin-bottom: 8px !important;
        }
        .cl-socialButtons {
          display: flex !important;
          gap: 10px !important;
          width: 100% !important;
        }
        .cl-socialButtonsBlockButton,
        .cl-socialButtonsIconButton,
        .cl-socialButtonsRoot button,
        .cl-socialButtons button,
        .cl-socialButtons a,
        button.cl-socialButtonsBlockButton,
        button.cl-socialButtonsIconButton,
        button[class*="socialButtonsBlockButton"],
        button[class*="socialButtonsIconButton"],
        button[class*="socialButtons"],
        [class*="socialButtons"] button,
        [class*="socialButtons"] a,
        button[data-localization-key*="socialButtons"],
        .cl-socialButtonsBlockButton__apple,
        .cl-socialButtonsBlockButton__google,
        .cl-socialButtonsIconButton__apple,
        .cl-socialButtonsIconButton__google,
        button[data-variant="outline"],
        .cl-button[data-variant="outline"] {
          flex: 1 !important;
          background-color: #1C1C1E !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          color: #FFFFFF !important;
          border-radius: 14px !important;
          -webkit-border-radius: 14px !important;
          border-top-left-radius: 14px !important;
          border-top-right-radius: 14px !important;
          border-bottom-left-radius: 14px !important;
          border-bottom-right-radius: 14px !important;
          -webkit-border-top-left-radius: 14px !important;
          -webkit-border-top-right-radius: 14px !important;
          -webkit-border-bottom-left-radius: 14px !important;
          -webkit-border-bottom-right-radius: 14px !important;
          --cl-border-radius: 14px !important;
          --clerk-border-radius: 14px !important;
          height: 44px !important;
          min-height: 44px !important;
          max-height: 44px !important;
          box-sizing: border-box !important;
          padding: 0 14px !important;
          transition: all 0.2s ease !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
          cursor: pointer !important;
          box-shadow: none !important;
        }

        /* Ensure pseudo-elements match the exact 14px squircle */
        .cl-socialButtonsBlockButton::before,
        .cl-socialButtonsBlockButton::after,
        .cl-socialButtonsIconButton::before,
        .cl-socialButtonsIconButton::after,
        [class*="socialButtons"] button::before,
        [class*="socialButtons"] button::after,
        .cl-socialButtons button::before,
        .cl-socialButtons button::after {
          border-radius: 14px !important;
          -webkit-border-radius: 14px !important;
          border-top-left-radius: 14px !important;
          border-top-right-radius: 14px !important;
          border-bottom-left-radius: 14px !important;
          border-bottom-right-radius: 14px !important;
          -webkit-border-top-left-radius: 14px !important;
          -webkit-border-top-right-radius: 14px !important;
          -webkit-border-bottom-left-radius: 14px !important;
          -webkit-border-bottom-right-radius: 14px !important;
        }
        .cl-socialButtonsBlockButton:hover,
        .cl-socialButtonsIconButton:hover,
        .cl-socialButtonsRoot button:hover,
        .cl-socialButtons button:hover,
        button[class*="socialButtons"]:hover {
          background-color: #2C2C2E !important;
          border-color: rgba(255, 255, 255, 0.22) !important;
        }
        .cl-socialButtonsBlockButton:active,
        .cl-socialButtonsIconButton:active,
        .cl-socialButtonsRoot button:active,
        .cl-socialButtons button:active,
        button[class*="socialButtons"]:active {
          transform: scale(0.98) !important;
        }
        .cl-socialButtonsBlockButtonText,
        .cl-socialButtonsIconButtonText,
        .cl-socialButtonsRoot button span,
        .cl-socialButtons button span,
        [class*="socialButtons"] span,
        button[class*="socialButtons"] span {
          color: #FFFFFF !important;
          font-size: 13px !important;
          font-weight: 600 !important;
        }

        /* 4. Make Apple icon crisp white in dark theme */
        .cl-socialButtonsBlockButton__apple svg,
        .cl-socialButtonsBlockButton__apple img,
        .cl-socialButtonsBlockButton__apple .cl-socialButtonsProviderIcon,
        .cl-socialButtonsBlockButton__apple path,
        .cl-socialButtonsIconButton__apple svg,
        .cl-socialButtonsIconButton__apple img,
        .cl-socialButtonsIconButton__apple .cl-socialButtonsProviderIcon,
        .cl-socialButtonsIconButton__apple path,
        [class*="apple"] svg,
        [class*="apple"] img,
        [class*="apple"] path {
          filter: brightness(0) invert(1) !important;
          fill: #FFFFFF !important;
          color: #FFFFFF !important;
        }

        /* 5. Divider */
        .cl-dividerRow {
          margin: 18px 0 !important;
        }
        .cl-dividerLine {
          background-color: rgba(255, 255, 255, 0.08) !important;
        }
        .cl-dividerText {
          color: rgba(255, 255, 255, 0.35) !important;
          font-size: 11px !important;
          font-weight: 500 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.08em !important;
        }

        /* 6. Form Field / Email Input */
        .cl-form {
          width: 100% !important;
        }
        .cl-formFieldRow {
          margin-bottom: 14px !important;
        }
        .cl-formFieldLabel {
          color: rgba(255, 255, 255, 0.7) !important;
          font-size: 12px !important;
          font-weight: 500 !important;
          margin-bottom: 6px !important;
          display: block !important;
        }
        .cl-formFieldInput {
          background-color: #1C1C1E !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          color: #FFFFFF !important;
          border-radius: 14px !important;
          height: 44px !important;
          font-size: 14px !important;
          padding: 0 14px !important;
          width: 100% !important;
          box-sizing: border-box !important;
          transition: all 0.2s ease !important;
        }
        .cl-formFieldInput:focus {
          border-color: rgba(255, 255, 255, 0.35) !important;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.2) !important;
          outline: none !important;
        }
        .cl-formFieldInput::placeholder {
          color: rgba(255, 255, 255, 0.25) !important;
        }

        /* 7. Continue Primary Button */
        .cl-formButtonPrimary {
          background-color: #FFFFFF !important;
          color: #000000 !important;
          border-radius: 14px !important;
          height: 44px !important;
          font-weight: 600 !important;
          font-size: 14px !important;
          border: none !important;
          width: 100% !important;
          cursor: pointer !important;
          transition: all 0.15s ease !important;
          margin-top: 14px !important;
        }
        .cl-formButtonPrimary:hover {
          background-color: rgba(255, 255, 255, 0.88) !important;
        }
        .cl-formButtonPrimary:active {
          transform: scale(0.98) !important;
        }

        /* 8. Clean Footer & Remove Clerk Dev Mode Badges */
        .cl-footer {
          background: transparent !important;
          border: none !important;
          padding: 16px 0 0 0 !important;
          margin: 0 !important;
          text-align: center !important;
        }
        .cl-footerAction {
          margin: 0 !important;
          text-align: center !important;
          justify-content: center !important;
          display: flex !important;
          align-items: center !important;
          gap: 6px !important;
        }
        .cl-footerActionText {
          color: rgba(255, 255, 255, 0.5) !important;
          font-size: 12px !important;
          margin: 0 !important;
          padding: 0 !important;
          display: inline-block !important;
        }
        .cl-footerActionLink {
          color: #FFFFFF !important;
          font-weight: 600 !important;
          font-size: 12px !important;
          margin: 0 !important;
          padding: 0 !important;
          display: inline-block !important;
        }
        .cl-footerActionLink:hover {
          text-decoration: underline !important;
        }
        .cl-footerPages,
        .cl-footerPages__signIn,
        [class*="footerPages"],
        [class*="securedBy"],
        .cl-footer__developmentMode,
        .cl-developmentModeBadge,
        .cl-devModeBadge,
        [class*="developmentMode"],
        [class*="devModeBadge"] {
          display: none !important;
        }

        /* 9. Identity & Verification inputs */
        .cl-identityPreview {
          background-color: #1C1C1E !important;
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
          background-color: #1C1C1E !important;
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
          color: #FFFFFF !important;
          border-radius: 12px !important;
        }
      ` }} />

      {/* Unified Single Card */}
      <div className="w-full max-w-[390px] bg-[#121214] border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col items-center backdrop-blur-xl">
        
        {/* Official App Logo */}
        <img 
          src="/logo-transparent.png" 
          alt="bokra" 
          className="h-12 w-auto object-contain mb-4 select-none drop-shadow-xl" 
        />

        {/* Brand Header */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold tracking-tight text-white mb-1">
            Sign In to bokra
          </h1>
          <p className="text-xs text-white/50 tracking-wide font-medium">
            Habit & Focus Companion
          </p>
        </div>

        {/* State 1: Login Form (Default) */}
        {status === 'login_required' && (
          <div className="w-full">
            <SignIn
              routing="hash"
              appearance={clerkAppearance}
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
            <div className="flex flex-col gap-2 w-full">
              <button
                onClick={handleCompleteAuth}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm transition-all active:scale-[0.98]"
              >
                Try Again
              </button>
              <button
                onClick={() => setStatus('login_required')}
                className="text-xs text-white/40 hover:text-white transition-colors cursor-pointer py-1"
              >
                Sign in with another account
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
