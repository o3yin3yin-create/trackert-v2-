import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyBjfeyhQy8EN507J7NKz11PI-HOuBPAUL4',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'tracker-v2-310.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'tracker-v2-310',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'tracker-v2-310.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '114149572420',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:114149572420:web:b760bd11bd3d3132a76111',
  measurementId: 'G-N0GHZ3XW7C',
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export async function getFirebaseMessaging() {
  if (typeof window === 'undefined') return null;
  const supported = await isSupported().catch(() => false);
  if (!supported) return null;
  try {
    return getMessaging(app);
  } catch {
    return null;
  }
}

export { app, auth, googleProvider, getToken, isSupported };
