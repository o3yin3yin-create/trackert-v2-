"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext({
  user: null,
  isSignedIn: false,
  isLoaded: true,
});

export const ClerkProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('bokra_local_user');
      if (savedUser) {
        try { return JSON.parse(savedUser); } catch(e) {}
      }
      return {
        id: 'desktop_user',
        firstName: 'User',
        primaryEmailAddress: { emailAddress: 'user@bokra.local' }
      };
    }
    return null;
  });

  return (
    <AuthContext.Provider value={{ user, isSignedIn: !!user, isLoaded: true }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useUser = () => useContext(AuthContext);

export const Show = ({ when, children }) => {
  const { isSignedIn } = useContext(AuthContext);
  if (when === 'signed-in' && isSignedIn) return children;
  if (when === 'signed-out' && !isSignedIn) return children;
  return null;
};

export const SignInButton = ({ children }) => children || null;
export const SignUpButton = ({ children }) => children || null;
export const UserButton = () => (
  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white/80 border border-white/20">
    B
  </div>
);
