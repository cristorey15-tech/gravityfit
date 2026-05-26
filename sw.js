// GravityFit — Service Worker (Cache-First Strategy)
// With VitePWA, the main service worker is auto-generated via workbox.
// This file serves as a fallback and is also included as a secondary asset.

const CACHE_NAME = 'gravityfit-v3';
const OFFLINE_URL = '/index.html';
const STATIC_CACHE = 'gravityfit-static-v3';

const PRECACHE_URLS = [
  OFFLINE_URL,
  '/css/index.css',
  '/css/components.css',
  '/css/screens.css',
  '/manifest.webmanifest',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL)),
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.addAll(PRECACHE_URLS).catch(() => {
          // Gracefully handle individual failures (some files may not exist yet)
        });
      }),
    ])
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME && k !== STATIC_CACHE)
            .map((k) => caches.delete(k))
        )
      ),
      self.clients.claim(),
    ])
  );
});

// Cache-First strategy for all requests
self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Skip non-GET requests and browser extension requests
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) return;

  // Network-first for external API calls (Firebase, etc.)
  if (url.hostname !== self.location.hostname) {
    e.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response.ok && response.type === 'basic') {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Cache-First for same-origin requests (JS, CSS, HTML, images, fonts)
  e.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        // Only cache successful responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const clone = response.clone();
        const cacheName = request.destination === 'document' ? CACHE_NAME : STATIC_CACHE;
        caches.open(cacheName).then((cache) => cache.put(request, clone));

        return response;
      }).catch(() => {
        // For navigation requests, fall back to offline page
        if (request.mode === 'navigate') {
          return caches.match(OFFLINE_URL);
        }
        // For other resources, try the offline page as a last resort
        return caches.match(OFFLINE_URL);
      });
    })
  );
});

// Notification click handler
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(self.registration.scope) && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(self.registration.scope);
        }
      })
  );
});

// Background sync for workouts
self.addEventListener('sync', (e) => {
  if (e.tag === 'sync-workouts') {
    e.waitUntil(syncWorkouts());
  }
});

async function syncWorkouts() {
  try {
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({ type: 'SYNC_WORKOUTS' });
    });
  } catch (e) {
    console.error('Sync failed:', e);
  }
}
