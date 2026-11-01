import { apiFetch } from '@/lib/api';

const SW_PATH = '/firebase-messaging-sw.js';

export function isIosDevice() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return iOS;
}

export function isStandaloneDisplay() {
  if (typeof window === 'undefined') return false;
  const standaloneMq = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  return standaloneMq || window.navigator.standalone === true;
}

export function iosNeedsHomeScreen() {
  return isIosDevice() && !isStandaloneDisplay();
}

export async function ensurePushServiceWorker() {
  if (typeof window === 'undefined') return null;
  if (window.__TAURI_INTERNALS__ || window.__TAURI__) return null;
  if (!('serviceWorker' in navigator)) return null;

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations.map(async (reg) => {
      const script = reg.active?.scriptURL || reg.waiting?.scriptURL || reg.installing?.scriptURL || '';
      if (!script.includes('firebase-messaging-sw.js')) {
        await reg.unregister();
      }
    })
  );

  const registration = await navigator.serviceWorker.register(SW_PATH, { scope: '/' });
  await navigator.serviceWorker.ready.catch(() => {});
  return registration;
}

export function detectPlatform() {
  if (typeof navigator === 'undefined') return 'web';
  if (isIosDevice()) return 'ios-pwa';
  if (/android/i.test(navigator.userAgent)) return 'android-pwa';
  return 'web';
}

export async function enablePushNotifications() {
  if (typeof window === 'undefined') throw new Error('window_required');
  if (!('Notification' in window)) throw new Error('unsupported');
  if (iosNeedsHomeScreen()) throw new Error('ios_homescreen');

  const registration = await ensurePushServiceWorker();
  if (!registration) throw new Error('no_service_worker');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('denied');

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) throw new Error('missing_vapid');

  const { getFirebaseMessaging, getToken } = await import('@/lib/firebase');
  const messaging = await getFirebaseMessaging();
  if (!messaging) throw new Error('unsupported');

  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });
  if (!token) throw new Error('no_token');

  const res = await apiFetch('/api/push/register', {
    method: 'POST',
    body: JSON.stringify({
      token,
      platform: detectPlatform(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    }),
  });
  if (!res.ok) throw new Error('register_failed');
  return { tokenRegistered: true };
}
