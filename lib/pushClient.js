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
  if (window.isSecureContext === false) throw new Error('secure_context_required');
  if (!('Notification' in window) || !('serviceWorker' in navigator)) throw new Error('unsupported');
  if (iosNeedsHomeScreen()) throw new Error('ios_homescreen');

  const registration = await ensurePushServiceWorker();
  if (!registration) throw new Error('no_service_worker');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('denied');

  const vapidKey =
    process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ||
    'BOtW9myrza4dOC7u93w2rpeBsU53vAZipK6ns8KV7Fnxv1yq8Q5lLxXynnZuazl3Eky8zgt63fIpXfD8q1RaB2g';
  if (!vapidKey) throw new Error('missing_vapid');

  const { getFirebaseMessaging, getToken } = await import('@/lib/firebase');
  const messaging = await getFirebaseMessaging();
  if (!messaging) throw new Error('unsupported');

  const readyReg = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise((resolve) => setTimeout(() => resolve(null), 2500)),
  ]).catch(() => null);
  const activeReg = readyReg || registration;

  let token = null;
  try {
    token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: activeReg,
    });
  } catch (err) {
    console.error('[push] getToken error:', err);
    const detail = err?.message || err?.code || '';
    throw new Error(`token_error: ${detail}`);
  }
  if (!token) throw new Error('no_token');

  const res = await apiFetch('/api/push/register', {
    method: 'POST',
    body: JSON.stringify({
      token,
      platform: detectPlatform(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    }),
  });
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    if (res.status === 401 || errorJson.error === 'unauthorized') {
      throw new Error('unauthorized');
    }
    throw new Error(`register_failed: ${errorJson.error || res.status}`);
  }
  return { tokenRegistered: true };
}
