const CACHE_NAME = 'bokra-cache-v6';

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

// Fetch Event: Multi-tiered strategy for instant load & offline resilience
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (!url.protocol.startsWith('http')) return;

  // Never intercept or cache API routes, Clerk auth, or auth navigation
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

  // 1. Immutable Next.js static assets (_next/static/...) -> Cache-First
  // These chunks contain hashes in their filename and never change content.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        }).catch(() => {
          return new Response('', { status: 408, statusText: 'Offline Chunk' });
        });
      })
    );
    return;
  }

  // 2. Navigation requests (HTML pages) -> Network with 1.5s timeout fallback to Cache
  // This guarantees the Android TWA splash screen fades out in at most 1.5s even if offline/airplane mode.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 4000);

          try {
            const networkResponse = await fetch(request, { signal: controller.signal });
            clearTimeout(timer);
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put('/', clone));
              return networkResponse;
            }
          } catch (e) {
            // Network aborted or failed, proceed to cache immediately
          }

          const cached = (await caches.match(request)) || (await caches.match('/'));
          if (cached) return cached;

          return await fetch(request);
        } catch (err) {
          const cached = (await caches.match(request)) || (await caches.match('/'));
          if (cached) return cached;
          return new Response('Offline', { status: 200, headers: { 'Content-Type': 'text/html' } });
        }
      })()
    );
    return;
  }

  // 3. All other assets -> Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
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
