"use client";
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { 
  onIdTokenChanged, 
  signInWithPopup, 
  signInWithRedirect, 
  signOut as fbSignOut,
  GoogleAuthProvider 
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { LogOut, User as UserIcon } from 'lucide-react';

const AuthContext = createContext({
  isLoaded: false,
  isSignedIn: false,
  user: null,
  fbUser: null,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [fbUser, setFbUser] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (currentFbUser) => {
      setFbUser(currentFbUser);

      if (currentFbUser) {
        try {
          const token = await currentFbUser.getIdToken();
          // Write session cookie for Next.js server routes with 7 days max-age
          document.cookie = `__session=${token}; path=/; max-age=604800; SameSite=Lax; Secure`;
        } catch (e) {
          console.warn('[auth] Failed to retrieve token on token change:', e);
        }

        const fullName = currentFbUser.displayName || 'User';
        const parts = fullName.trim().split(/\s+/);
        const firstName = parts[0] || (currentFbUser.email?.split('@')[0] || 'User');
        const lastName = parts.slice(1).join(' ') || '';

        setUser({
          id: currentFbUser.uid,
          uid: currentFbUser.uid,
          fullName,
          firstName,
          lastName,
          imageUrl: currentFbUser.photoURL || '',
          primaryEmailAddress: { emailAddress: currentFbUser.email || '' },
          emailAddresses: [{ emailAddress: currentFbUser.email || '' }],
          username: currentFbUser.displayName ? currentFbUser.displayName.replace(/\s+/g, '').toLowerCase() : (currentFbUser.email?.split('@')[0] || null),
        });
      } else {
        document.cookie = '__session=; path=/; max-age=0; SameSite=Lax; Secure';
        setUser(null);
      }

      setIsLoaded(true);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (popupErr) {
      // If popup was blocked or failed on mobile Safari/Chrome, fall back to redirect
      if (popupErr?.code === 'auth/popup-blocked' || popupErr?.code === 'auth/popup-closed-by-user') {
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (redirErr) {
          console.error('[auth] Google sign-in redirect failed:', redirErr);
        }
      } else {
        console.error('[auth] Google sign-in failed:', popupErr);
      }
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await fbSignOut(auth);
      document.cookie = '__session=; path=/; max-age=0; SameSite=Lax; Secure';
      setUser(null);
      setFbUser(null);
      window.location.reload();
    } catch (e) {
      console.error('[auth] Sign-out failed:', e);
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      isLoaded,
      isSignedIn: !!user,
      user,
      fbUser,
      signInWithGoogle,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// Re-export AuthProvider as ClerkProvider so app/layout.jsx works without modification
export { AuthProvider as ClerkProvider };

export function useUser() {
  const { isLoaded, isSignedIn, user } = useContext(AuthContext);
  return { isLoaded, isSignedIn, user };
}

export function useAuth() {
  const { isLoaded, isSignedIn, user, fbUser } = useContext(AuthContext);
  const getToken = useCallback(async () => {
    if (!fbUser) return null;
    try {
      return await fbUser.getIdToken();
    } catch {
      return null;
    }
  }, [fbUser]);

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
  const { signInWithGoogle } = useContext(AuthContext);

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
      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white text-black text-sm font-medium hover:bg-white/90 active:scale-95 transition-all shadow-sm"
      {...props}
    >
      <GoogleIcon className="w-4 h-4" />
      <span>تسجيل الدخول</span>
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
        className="w-8 h-8 rounded-full overflow-hidden border border-white/20 hover:border-white/50 transition-all flex items-center justify-center bg-zinc-800 text-white font-medium text-xs focus:outline-none focus:ring-2 focus:ring-white/30 cursor-pointer active:scale-95"
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
            <div className="overflow-hidden">
              <p className="text-sm font-semibold truncate text-white">{user.fullName}</p>
              <p className="text-xs text-white/50 truncate font-mono">{user.primaryEmailAddress?.emailAddress}</p>
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
  const { signInWithGoogle, isLoaded, isSignedIn, user } = useContext(AuthContext);

  return (
    <div className="w-full max-w-sm mx-auto p-6 rounded-3xl bg-zinc-950/90 border border-white/10 backdrop-blur-xl shadow-2xl text-center select-none">
      <div className="mb-6">
        <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
          <UserIcon className="w-6 h-6 text-white/80" />
        </div>
        <h2 className="text-xl font-bold text-white mb-1">تسجيل الدخول إلى bokra</h2>
        <p className="text-xs text-white/50">تابع عاداتك وأهدافك اليومية بدقة</p>
      </div>

      <button
        type="button"
        onClick={signInWithGoogle}
        className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-white text-black font-semibold text-sm hover:bg-white/90 active:scale-95 transition-all shadow-lg cursor-pointer"
      >
        <GoogleIcon className="w-5 h-5" />
        <span>متابعة باستخدام Google</span>
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

function GoogleIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}
