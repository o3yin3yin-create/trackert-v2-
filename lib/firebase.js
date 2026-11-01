import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: 'AIzaSyBjfeyhQy8EN507J7NKz11PI-HOuBPAUL4',
  authDomain: 'tracker-v2-310.firebaseapp.com',
  projectId: 'tracker-v2-310',
  storageBucket: 'tracker-v2-310.firebasestorage.app',
  messagingSenderId: '114149572420',
  appId: '1:114149572420:web:b760bd11bd3d3132a76111',
  measurementId: 'G-N0GHZ3XW7C',
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

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

export { app, getToken, isSupported };
