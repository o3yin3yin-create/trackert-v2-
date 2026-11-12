"use client";
import { 
  ClerkProvider, 
  useUser, 
  useAuth, 
  useClerk, 
  Show as ClerkShow, 
  SignInButton, 
  SignUpButton, 
  UserButton, 
  SignIn, 
  SignUp 
} from '@clerk/nextjs';

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

export { ClerkProvider, useUser, useAuth, useClerk, SignInButton, SignUpButton, UserButton, SignIn, SignUp };
