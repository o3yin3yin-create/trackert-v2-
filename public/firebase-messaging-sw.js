const CACHE_NAME = 'bokra-cache-v2';

// Essential core assets to pre-cache during installation
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
  '/logo.png',
  '/logo-transparent.png'
];

// Install Event: pre-cache core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[bokra SW] Pre-caching offline app shell');
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[bokra SW] Pre-cache partial fail:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event: clean up old caches & take immediate control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[bokra SW] Removing outdated cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch Event: Network-First with Cache Fallback for complete offline reliability
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (!url.protocol.startsWith('http')) return;

  // Never intercept or cache API routes, Clerk auth, or Firebase
  if (
    url.hostname.includes('clerk') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('googleapis.com') ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  // Network First with Cache Fallback
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
            if (request.mode === 'navigate') {
              cache.put('/', networkResponse.clone());
            }
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        console.log('[bokra SW] Offline mode fallback for:', url.pathname);
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === 'navigate') {
          const cachedRoot = await caches.match('/');
          if (cachedRoot) return cachedRoot;
        }
        return new Response('', { status: 408, statusText: 'Offline Asset Unavailable' });
      })
  );
});

// Firebase Cloud Messaging & Push Notifications
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { notification: { title: 'bokra', body: event.data.text() } };
    }
  }

  const notification = data.notification || {};
  const title = notification.title || 'bokra';
  const options = {
    body: notification.body || 'Habit reminder!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: data.data || {},
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
            break;
          }
        }
        return client.focus();
      }
      return self.clients.openWindow('/');
    })
  );
});
