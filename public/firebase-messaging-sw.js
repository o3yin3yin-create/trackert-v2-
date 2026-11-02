/* bokra FCM + PWA worker — keep at site root scope */
try {
  importScripts('https://www.gstatic.com/firebasejs/12.13.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging-compat.js');

  if (typeof firebase !== 'undefined' && firebase.initializeApp) {
    firebase.initializeApp({
      apiKey: 'AIzaSyBjfeyhQy8EN507J7NKz11PI-HOuBPAUL4',
      authDomain: 'tracker-v2-310.firebaseapp.com',
      projectId: 'tracker-v2-310',
      storageBucket: 'tracker-v2-310.firebasestorage.app',
      messagingSenderId: '114149572420',
      appId: '1:114149572420:web:b760bd11bd3d3132a76111',
    });

    try {
      const messaging = firebase.messaging();
      messaging.onBackgroundMessage((payload) => {
        if (payload && payload.notification) return;
        const data = (payload && payload.data) || {};
        const title = data.title || 'bokra';
        return self.registration.showNotification(title, {
          body: data.body || '',
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: data.tag || 'bokra',
          data: { url: data.url || '/' },
          vibrate: [100, 50, 100],
        });
      });
    } catch (_) {}
  }
} catch (e) {
  // Fallback to native push event listener below
}

const CACHE_NAME = 'bokra-cache-v10';
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
  '/logo.png',
  '/logo-transparent.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (!url.protocol.startsWith('http')) return;
  if (
    url.hostname.includes('clerk') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('googleapis.com') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/__clerk') ||
    url.pathname.startsWith('/sign-in') ||
    url.pathname.startsWith('/sign-up')
  ) {
    return;
  }

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        }).catch(() => cached);
      })
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return networkResponse;
      })
      .catch(async () => (await caches.match(request)) || (await caches.match('/')) || new Response('', { status: 408 }))
  );
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch (_) {
    payload = { data: { title: 'bokra', body: event.data.text() } };
  }
  const notif = payload.notification || {};
  const data = payload.data || payload;
  const title = notif.title || data.title || 'bokra';
  const body = notif.body || data.body || '';
  const url = (data && data.url) || '/';
  const tag = (data && data.tag) || (notif && notif.tag) || 'bokra';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag,
      data: { url },
      vibrate: [150, 75, 150],
      renotify: true,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          const focusPromise = client.focus();
          if (targetUrl && targetUrl !== '/' && 'navigate' in client) {
            try { client.navigate(targetUrl); } catch (_) {}
          }
          return focusPromise;
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
