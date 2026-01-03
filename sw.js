const APP_CACHE = 'osp-survey-pro-app-v8';
const MAP_CACHE = 'osp-survey-pro-maps-v1';

// App shell – cache BOTH possible entry points
const APP_SHELL = [
  './',
  './index.html',
  './index.js',     // GitHub Pages entry
  './index.tsx',    // Netlify entry
  './metadata.json',
  './sw.js'
];

// ============================
// INSTALL
// ============================
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(APP_CACHE).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// ============================
// ACTIVATE
// ============================
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => ![APP_CACHE, MAP_CACHE].includes(k))
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ============================
// FETCH
// ============================
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // 1️⃣ App navigation → index.html
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then(res => res || fetch(req))
    );
    return;
  }

  // 2️⃣ Map tiles (stale-while-revalidate)
  if (url.hostname.includes('tile.openstreetmap.org')) {
    event.respondWith(
      caches.open(MAP_CACHE).then(cache =>
        cache.match(req).then(cached => {
          const fetchPromise = fetch(req).then(networkRes => {
            cache.put(req, networkRes.clone());
            return networkRes;
          });
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // 3️⃣ Cache-first for everything else
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;

      return fetch(req).then(networkRes => {
        if (
          networkRes &&
          networkRes.status === 200 &&
          (networkRes.type === 'basic' || networkRes.type === 'cors')
        ) {
          caches.open(APP_CACHE).then(cache =>
            cache.put(req, networkRes.clone())
          );
        }
        return networkRes;
      });
    })
  );
});
