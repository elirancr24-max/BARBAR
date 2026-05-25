// BarAbargil PWA Service Worker
const CACHE_VERSION = 'v1';
const STATIC_CACHE = `barabargil-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `barabargil-runtime-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  '/',
  '/book',
  '/login',
  '/offline',
  '/logo.jpg',
  '/apple-touch-icon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {}))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k)),
      ),
    ).then(() => self.clients.claim()),
  );
});

// Strategy:
//   GET HTML  → network-first, fallback to cache, then /offline
//   GET API   → network-first, fallback to cache (short TTL)
//   GET assets → cache-first
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Don't cache Socket.IO / API calls aggressively
  if (url.pathname.startsWith('/api/') || url.hostname !== self.location.hostname) {
    // Network-first for API (and 3rd-party fonts)
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok && url.hostname === self.location.hostname) {
            const clone = res.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(request, clone));
          }
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || new Response('Offline', { status: 503 }))),
    );
    return;
  }

  // HTML — network-first with offline fallback
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(request, clone));
          return res;
        })
        .catch(() =>
          caches.match(request)
            .then((r) => r || caches.match('/offline'))
            .then((r) => r || new Response('Offline', { status: 503 })),
        ),
    );
    return;
  }

  // Static assets — cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(request, clone));
        }
        return res;
      }).catch(() => new Response('', { status: 504 }));
    }),
  );
});

// Allow manual skip-waiting from client
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
