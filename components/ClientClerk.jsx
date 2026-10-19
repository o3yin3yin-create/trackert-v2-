"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { isTauri, invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { LogOut, ExternalLink, KeyRound } from 'lucide-react';

const AuthContext = createContext({
  user: null,
  isSignedIn: false,
  isLoaded: false,
  signOut: () => {},
  openLoginInBrowser: () => {},
});

export const ClerkProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isWaitingForBrowser, setIsWaitingForBrowser] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  // Load saved session on startup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('bokra_desktop_user');
      const savedToken = localStorage.getItem('bokra_desktop_token');
      if (savedUser && savedToken) {
        try {
          setUser(JSON.parse(savedUser));
        } catch (e) {
          localStorage.removeItem('bokra_desktop_user');
          localStorage.removeItem('bokra_desktop_token');
        }
      }
      setIsLoaded(true);
    }
  }, []);

  // Listen for callback from Tauri loopback server
  useEffect(() => {
    let unlisten = null;
    let isSubscribed = true;

    if (typeof window !== 'undefined') {
      try {
        if (isTauri()) {
          listen('desktop-auth-callback', (event) => {
            if (!isSubscribed) return;
            try {
              const queryString = event.payload || '';
              const params = new URLSearchParams(queryString);
              const token = params.get('token');
              const userStr = params.get('user');

              if (token) {
                applyLoginData(token, userStr);
              }
            } catch (err) {
              console.error('[bokra desktop-auth-callback Error]', err);
            }
          }).then((fn) => {
            unlisten = fn;
          }).catch(() => {});
        }
      } catch (e) {}
    }

    return () => {
      isSubscribed = false;
      if (unlisten) unlisten();
    };
  }, []);

  const applyLoginData = (token, userStr) => {
    localStorage.setItem('bokra_desktop_token', token);
    let parsedUser = { id: 'user_' + Date.now(), name: 'User' };
    if (userStr) {
      try {
        parsedUser = typeof userStr === 'string' ? JSON.parse(userStr) : userStr;
      } catch (e) {}
    }
    localStorage.setItem('bokra_desktop_user', JSON.stringify(parsedUser));
    setUser(parsedUser);
    setIsWaitingForBrowser(false);
    setShowManualInput(false);
    window.dispatchEvent(new CustomEvent('bokra-desktop-auth-success', { detail: { token, user: parsedUser } }));
  };

  const openLoginInBrowser = async () => {
    try {
      setIsWaitingForBrowser(true);
      let port = 28282;

      try {
        if (isTauri()) {
          port = await invoke('start_auth_server');
        }
      } catch (e) {
        console.warn('Tauri start_auth_server fallback to port 28282', e);
      }

      const loginUrl = `https://trackert-v2.vercel.app/desktop-auth?port=${port}`;

      try {
        if (isTauri()) {
          await invoke('open_system_browser', { url: loginUrl });
        } else {
          window.open(loginUrl, '_blank');
        }
      } catch (openErr) {
        console.warn('Tauri open_system_browser fallback:', openErr);
        window.open(loginUrl, '_blank');
      }
    } catch (err) {
      console.error('Failed to open login in system browser:', err);
    }
  };

  const handleManualCodeSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    try {
      const code = manualCode.trim();
      applyLoginData(code, { id: 'desktop_user', name: 'User' });
    } catch (err) {
      alert('Invalid key');
    }
  };

  const signOut = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('bokra_desktop_token');
      localStorage.removeItem('bokra_desktop_user');
      setUser(null);
      window.dispatchEvent(new CustomEvent('bokra-desktop-logout'));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isSignedIn: !!user,
        isLoaded,
        signOut,
        openLoginInBrowser,
      }}
    >
      {children}

      {/* Waiting for Browser Authentication Modal */}
      {isWaitingForBrowser && (
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1C1C1E] border border-white/10 rounded-3xl p-7 max-w-sm w-full text-center shadow-2xl flex flex-col items-center animate-in fade-in zoom-in-95">
            
            {/* App Logo */}
            <img 
              src="/logo-transparent.png" 
              alt="bokra" 
              className="h-12 w-auto object-contain mb-4 select-none drop-shadow-xl" 
            />
            
            <h3 className="text-lg font-bold text-white mb-2">
              Signing in via Browser...
            </h3>
            
            <p className="text-xs text-white/60 mb-6 leading-relaxed">
              We opened the secure sign-in page in your default browser. Once completed, your habits and progress will link automatically.
            </p>

            <div className="flex flex-col gap-2 w-full">
              <button
                type="button"
                onClick={openLoginInBrowser}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition-colors cursor-pointer active:scale-95 flex items-center justify-center gap-2"
              >
                <ExternalLink size={14} />
                Reopen Browser
              </button>

              <button
                type="button"
                onClick={() => setShowManualInput(!showManualInput)}
                className="text-[11px] text-white/40 hover:text-white/80 py-1 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <KeyRound size={12} />
                {showManualInput ? 'Hide manual entry' : 'Enter key manually?'}
              </button>

              {showManualInput && (
                <form onSubmit={handleManualCodeSubmit} className="flex gap-2 mt-2 w-full">
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Paste authentication key..."
                    className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white/30"
                  />
                  <button
                    type="submit"
                    className="bg-white text-black font-semibold text-xs px-3.5 py-1.5 rounded-xl hover:bg-white/90 transition-colors cursor-pointer"
                  >
                    Connect
                  </button>
                </form>
              )}

              <button
                type="button"
                onClick={() => setIsWaitingForBrowser(false)}
                className="w-full py-2 rounded-xl text-white/40 hover:text-white font-medium text-xs transition-colors cursor-pointer mt-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useUser = () => {
  const { user, isLoaded } = useContext(AuthContext);
  return { user, isLoaded };
};

export const Show = ({ when, children }) => {
  const { isSignedIn, isLoaded } = useContext(AuthContext);
  if (!isLoaded) return null;
  if (when === 'signed-in' && isSignedIn) return children;
  if (when === 'signed-out' && !isSignedIn) return children;
  return null;
};

export const SignInButton = ({ children }) => {
  const { openLoginInBrowser } = useContext(AuthContext);
  return (
    <div onClick={openLoginInBrowser} className="inline-block cursor-pointer">
      {children}
    </div>
  );
};

export const SignUpButton = ({ children }) => {
  const { openLoginInBrowser } = useContext(AuthContext);
  return (
    <div onClick={openLoginInBrowser} className="inline-block cursor-pointer">
      {children}
    </div>
  );
};

export const UserButton = ({ appearance }) => {
  const { user, signOut } = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);

  const initial = user?.name 
    ? user.name.charAt(0).toUpperCase() 
    : (user?.email ? user.email.charAt(0).toUpperCase() : 'U');

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-9 h-9 rounded-full bg-white/10 border border-white/20 text-white font-bold text-sm flex items-center justify-center hover:scale-105 transition-transform overflow-hidden cursor-pointer active:scale-95"
        title={user?.name || user?.email || 'Account'}
      >
        {user?.avatar ? (
          <img src={user.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" />
        ) : (
          initial
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-64 bg-[#1C1C1E] border border-white/10 rounded-2xl shadow-2xl p-4 z-50 text-left animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3 mb-3 pb-3 border-b border-white/5">
              <div className="w-10 h-10 rounded-full bg-white/10 text-white font-bold flex items-center justify-center shrink-0 overflow-hidden border border-white/10">
                {user?.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                ) : (
                  initial
                )}
              </div>
              <div className="flex flex-col overflow-hidden text-left">
                <span className="text-sm font-bold text-white truncate">{user?.name || 'bokra User'}</span>
                <span className="text-xs text-white/50 truncate font-mono">{user?.email || ''}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setIsOpen(false);
                signOut();
              }}
              className="w-full py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-95"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
};
