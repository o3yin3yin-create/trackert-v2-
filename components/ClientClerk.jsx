"use client";
import React from 'react';
import {
  ClerkProvider as BaseClerkProvider,
  useUser,
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
  useClerk,
  useAuth,
} from '@clerk/react';

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || 'pk_test_c2luY2VyZS1zcG9uZ2UtNDAuY2xlcmsuYWNjb3VudHMuZGV2JA';

export const ClerkProvider = ({ children }) => {
  return (
    <BaseClerkProvider publishableKey={PUBLISHABLE_KEY}>
      {children}
    </BaseClerkProvider>
  );
};

export { useUser, Show, SignInButton, SignUpButton, UserButton, useClerk, useAuth };

