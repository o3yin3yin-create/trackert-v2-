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

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations.map(async (reg) => {
        const script = reg.active?.scriptURL || reg.waiting?.scriptURL || reg.installing?.scriptURL || '';
        if (!script.includes('firebase-messaging-sw.js')) {
          await reg.unregister().catch(() => {});
        }
      })
    );
  } catch {
    // ignore
  }

  try {
    const registration = await navigator.serviceWorker.register(SW_PATH, { scope: '/' });
    await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]).catch(() => {});
    return registration;
  } catch (err) {
    console.error('[push] SW register error:', err);
    return null;
  }
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

  let currentPermission = Notification.permission;
  if (currentPermission !== 'granted') {
    currentPermission = await Notification.requestPermission();
  }
  if (currentPermission !== 'granted') throw new Error('denied');

  const isTauri = typeof window !== 'undefined' && (
    window.__TAURI_INTERNALS__ !== undefined || 
    window.__TAURI__ !== undefined ||
    (typeof window.isTauri === 'function' ? window.isTauri() : window.isTauri === true) ||
    window.location.protocol === 'tauri:' ||
    window.location.protocol === 'asset:' ||
    window.location.hostname === 'tauri.localhost' ||
    process.env.NEXT_PUBLIC_IS_DESKTOP === 'true'
  );

  let tokenRegistered = false;
  if (!isTauri && 'serviceWorker' in navigator && window.isSecureContext !== false) {
    try {
      const registration = await ensurePushServiceWorker();
      if (registration) {
        const vapidKey =
          process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ||
          'BOtW9myrza4dOC7u93w2rpeBsU53vAZipK6ns8KV7Fnxv1yq8Q5lLxXynnZuazl3Eky8zgt63fIpXfD8q1RaB2g';
        const { getFirebaseMessaging, getToken } = await import('@/lib/firebase');
        const messaging = await getFirebaseMessaging();
        if (messaging && vapidKey) {
          const readyReg = await Promise.race([
            navigator.serviceWorker.ready,
            new Promise((resolve) => setTimeout(() => resolve(null), 2500)),
          ]).catch(() => null);
          const activeReg = readyReg || registration;

          const token = await getToken(messaging, {
            vapidKey,
            serviceWorkerRegistration: activeReg,
          }).catch((err) => {
            console.warn('[push] getToken fallback:', err);
            return null;
          });

          if (token) {
            await apiFetch('/api/push/register', {
              method: 'POST',
              body: JSON.stringify({
                token,
                platform: detectPlatform(),
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
              }),
            }).catch(() => {});
            tokenRegistered = true;
          }
        }
      }
    } catch (err) {
      console.warn('[push] background FCM registration notice:', err);
    }
  }

  return { permission: 'granted', tokenRegistered };
}
