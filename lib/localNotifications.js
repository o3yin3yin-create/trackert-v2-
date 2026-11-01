/**
 * lib/localNotifications.js
 * Cross-platform client notification helper (Web, PWA, macOS, Windows).
 * Works directly in the browser/OS without requiring external cloud servers.
 */

export function canShowNotification() {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window && Notification.permission === 'granted';
}

export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  try {
    const perm = await Notification.requestPermission();
    return perm;
  } catch {
    return 'default';
  }
}

/**
 * Play a gentle, crisp audio notification chime using Web Audio API.
 * Does not require external audio files or network requests.
 */
export function playNotificationSound() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    
    // First pleasant chime tone (C6: 1046 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1046.5, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Second ascending tone (E6: 1318 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.5, now + 0.12);
    gain2.gain.setValueAtTime(0.12, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);
  } catch {
    // Ignore audio context autoplay restrictions
  }
}

/**
 * Show a native OS/browser notification.
 * Handles desktop (new Notification) and mobile PWA (serviceWorker.showNotification).
 */
export function showLocalNotification(title, options = {}) {
  if (typeof window === 'undefined') return null;
  if (!('Notification' in window)) return null;
  if (Notification.permission !== 'granted') return null;

  const notifOptions = {
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [150, 75, 150],
    tag: options.tag || 'bokra-alert',
    renotify: true,
    silent: false,
    ...options,
  };

  playNotificationSound();

  // Try Service Worker notification first for mobile PWA support
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.ready) {
    navigator.serviceWorker.ready
      .then((registration) => {
        if (registration && registration.showNotification) {
          registration.showNotification(title, notifOptions).catch(() => {
            fallbackDirectNotification(title, notifOptions);
          });
        } else {
          fallbackDirectNotification(title, notifOptions);
        }
      })
      .catch(() => {
        fallbackDirectNotification(title, notifOptions);
      });
    return true;
  }

  return fallbackDirectNotification(title, notifOptions);
}

function fallbackDirectNotification(title, options) {
  try {
    const notif = new Notification(title, options);
    notif.onclick = () => {
      window.focus();
      if (options.url && typeof window !== 'undefined') {
        window.location.href = options.url;
      }
      notif.close();
    };
    return notif;
  } catch {
    return null;
  }
}
