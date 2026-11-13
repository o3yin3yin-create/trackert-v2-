"use client";
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { LogOut, User as UserIcon, Loader2 } from 'lucide-react';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '114149572420-hvnsmkla4r421v3mcuOq6tl1874apme7.apps.googleusercontent.com';

const AuthContext = createContext({
  isLoaded: false,
  isSignedIn: false,
  user: null,
  isSigningIn: false,
  signInWithGoogle: () => {},
  signOut: async () => {},
  token: null,
});

export function AuthProvider({ children }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const isGsiLoadedRef = useRef(false);

  // 1. Initial local state restoration (Zero-latency instant load)
  useEffect(() => {
    let localUser = null;
    let localToken = null;
    try {
      const storedUser = localStorage.getItem('bokra_session_user');
      if (storedUser) localUser = JSON.parse(storedUser);
      localToken = localStorage.getItem('bokra_desktop_token') || localStorage.getItem('bokra_cached_clerk_token');
    } catch (_) {}

    if (localUser && localUser.id) {
      setUser(localUser);
      setToken(localToken);
      setIsLoaded(true);
    }

    // Background session verification with server
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (data.authenticated && data.user) {
          setUser(data.user);
          try {
            localStorage.setItem('bokra_session_user', JSON.stringify(data.user));
          } catch (_) {}
        } else if (localUser) {
          // Server says unauthenticated
          setUser(null);
          setToken(null);
          try {
            localStorage.removeItem('bokra_session_user');
            localStorage.removeItem('bokra_desktop_token');
            localStorage.removeItem('bokra_cached_clerk_token');
          } catch (_) {}
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsLoaded(true);
      });
  }, []);

  // 2. Authenticate with Google ID token received from GIS
  const handleGoogleCredential = useCallback(async (credential) => {
    if (!credential) return;
    setIsSigningIn(true);
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.user) {
        setUser(data.user);
        setToken(data.token);

        try {
          localStorage.setItem('bokra_session_user', JSON.stringify(data.user));
          if (data.token) {
            localStorage.setItem('bokra_desktop_token', data.token);
            localStorage.setItem('bokra_cached_clerk_token', data.token);
          }
        } catch (_) {}

        // If on /sign-in, navigate to home
        if (typeof window !== 'undefined' && window.location.pathname.startsWith('/sign-in')) {
          window.location.href = '/';
        }
      } else {
        alert(data.error || 'فشل تسجيل الدخول باستخدام Google');
      }
    } catch (err) {
      console.error('[auth] Google sign-in failed:', err);
      alert('تعذر الاتصال بخدمة تسجيل الدخول، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  // 3. Load Google Identity Services (GIS) script
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initGsi = () => {
      if (!window.google?.accounts?.id) return;
      isGsiLoadedRef.current = true;

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => {
          if (response?.credential) {
            handleGoogleCredential(response.credential);
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });
    };

    if (window.google?.accounts?.id) {
      initGsi();
    } else {
      const existingScript = document.getElementById('google-gsi-script');
      if (!existingScript) {
        const script = document.createElement('script');
        script.id = 'google-gsi-script';
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = initGsi;
        document.head.appendChild(script);
      }
    }
  }, [handleGoogleCredential]);

  // 4. Trigger Google Sign-In prompt
  const signInWithGoogle = useCallback(() => {
    if (typeof window === 'undefined') return;

    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            // Prompt was dismissed or blocked; redirect to /sign-in
            if (window.location.pathname !== '/sign-in') {
              window.location.href = '/sign-in';
            }
          }
        });
        return;
      } catch (e) {
        console.warn('[auth] GSI prompt error:', e);
      }
    }

    // Fallback: Navigate to /sign-in page
    if (window.location.pathname !== '/sign-in') {
      window.location.href = '/sign-in';
    }
  }, []);

  // 5. Sign out
  const signOut = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
      if (window.google?.accounts?.id) {
        window.google.accounts.id.disableAutoSelect();
      }
    } catch (_) {}

    try {
      localStorage.removeItem('bokra_session_user');
      localStorage.removeItem('bokra_desktop_token');
      localStorage.removeItem('bokra_cached_clerk_token');
      localStorage.removeItem('daybase_cached_user');
      localStorage.removeItem('daybase_owner_user_id');
      document.cookie = '__bokra_session=; path=/; max-age=0; SameSite=Lax';
      document.cookie = '__session=; path=/; max-age=0; SameSite=Lax';
    } catch (_) {}

    setUser(null);
    setToken(null);
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isLoaded,
        isSignedIn: Boolean(user?.id),
        user,
        token,
        isSigningIn,
        signInWithGoogle,
        signOut,
        handleGoogleCredential,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export { AuthProvider as ClerkProvider };

export function useUser() {
  const { isLoaded, isSignedIn, user } = useContext(AuthContext);
  return { isLoaded, isSignedIn, user };
}

export function useAuth() {
  const { isLoaded, isSignedIn, user, token } = useContext(AuthContext);
  const getToken = useCallback(async () => {
    return token || (typeof window !== 'undefined' ? localStorage.getItem('bokra_desktop_token') : null);
  }, [token]);

  return {
    isLoaded,
    isSignedIn,
    userId: user?.id || null,
    getToken,
  };
}

export function useClerk() {
  const { signOut, signInWithGoogle } = useContext(AuthContext);
  return {
    signOut,
    openSignIn: signInWithGoogle,
  };
}

export function Show({ when, fallback = null, children }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) {
    if (when === 'signed-out') return children;
    return fallback;
  }
  if (when === 'signed-in' && isSignedIn) return children;
  if (when === 'signed-out' && !isSignedIn) return children;
  return fallback;
}

export function SignInButton({ children, mode, ...props }) {
  const { signInWithGoogle, isSigningIn } = useContext(AuthContext);

  if (children) {
    return React.cloneElement(children, {
      onClick: (e) => {
        if (children.props?.onClick) children.props.onClick(e);
        signInWithGoogle();
      },
    });
  }

  return (
    <button
      type="button"
      onClick={signInWithGoogle}
      disabled={isSigningIn}
      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white text-black text-sm font-medium hover:bg-white/90 active:scale-95 transition-all shadow-sm cursor-pointer disabled:opacity-50"
      {...props}
    >
      {isSigningIn ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <GoogleIcon className="w-4 h-4" />}
      <span>{isSigningIn ? 'جاري التحميل...' : 'تسجيل الدخول'}</span>
    </button>
  );
}

export function SignUpButton(props) {
  return <SignInButton {...props} />;
}

export function UserButton({ afterSignOutUrl = '/', appearance = {} }) {
  const { user, signOut } = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (!user) return null;

  const initial = (user.firstName?.[0] || user.fullName?.[0] || 'U').toUpperCase();

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-full rounded-full overflow-hidden border border-white/20 hover:border-white/50 transition-all flex items-center justify-center bg-zinc-800 text-white font-medium text-xs focus:outline-none cursor-pointer active:scale-95"
        aria-label="User profile"
      >
        {user.imageUrl ? (
          <img 
            src={user.imageUrl} 
            alt={user.fullName || 'User'} 
            className="w-full h-full object-cover" 
            referrerPolicy="no-referrer"
          />
        ) : (
          <span>{initial}</span>
        )}
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-64 rounded-2xl bg-zinc-950/95 border border-white/10 shadow-2xl backdrop-blur-xl py-2 z-50 text-white animate-in fade-in zoom-in-95 duration-150"
          style={{ direction: 'rtl' }}
        >
          <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 border border-white/20 flex-shrink-0 flex items-center justify-center font-bold text-sm">
              {user.imageUrl ? (
                <img src={user.imageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                initial
              )}
            </div>
            <div className="overflow-hidden text-right">
              <p className="text-sm font-semibold truncate text-white">{user.fullName}</p>
              <p className="text-xs text-white/50 truncate font-mono">{user.primaryEmailAddress?.emailAddress || user.email}</p>
            </div>
          </div>

          <div className="p-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                signOut();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
            >
              <LogOut size={16} />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function SignIn() {
  const { isSignedIn, isSigningIn, signInWithGoogle, handleGoogleCredential } = useContext(AuthContext);
  const buttonContainerRef = useRef(null);

  useEffect(() => {
    if (isSignedIn && typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }, [isSignedIn]);

  // Render official Google button into container
  useEffect(() => {
    const renderBtn = () => {
      if (window.google?.accounts?.id && buttonContainerRef.current) {
        buttonContainerRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(buttonContainerRef.current, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          shape: 'pill',
          text: 'continue_with',
          width: 320,
          logo_alignment: 'center',
        });
      }
    };

    if (window.google?.accounts?.id) {
      renderBtn();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          renderBtn();
        }
      }, 200);
      return () => clearInterval(interval);
    }
  }, []);

  return (
    <div className="w-full max-w-sm mx-auto p-6 rounded-3xl bg-zinc-950/90 border border-white/10 backdrop-blur-xl shadow-2xl text-center select-none">
      <div className="mb-6">
        <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
          <UserIcon className="w-6 h-6 text-white/80" />
        </div>
        <h2 className="text-xl font-bold text-white mb-1">تسجيل الدخول إلى bokra</h2>
        <p className="text-xs text-white/50">تابع عاداتك وأهدافك اليومية بدقة</p>
      </div>

      {/* Official Google Button Container */}
      <div className="flex justify-center my-4 min-h-[44px]">
        <div ref={buttonContainerRef} className="flex justify-center w-full" />
      </div>

      {/* Fallback button if GSI container is still loading */}
      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={isSigningIn}
        className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-white text-black font-semibold text-sm hover:bg-white/90 active:scale-95 transition-all shadow-lg cursor-pointer disabled:opacity-50 mt-2"
      >
        {isSigningIn ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin text-black" />
            <span>جاري الاتصال بـ Google...</span>
          </>
        ) : (
          <>
            <GoogleIcon className="w-5 h-5" />
            <span>متابعة باستخدام Google</span>
          </>
        )}
      </button>

      <p className="mt-6 text-[11px] text-white/40 leading-relaxed">
        بتسجيل الدخول، أنت توافق على شروط الخدمة وسياسة الخصوصية الخاصة بـ bokra.
      </p>
    </div>
  );
}

export function SignUp(props) {
  return <SignIn {...props} />;
}

function GoogleIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}
