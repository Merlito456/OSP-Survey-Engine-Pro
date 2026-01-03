const APP_CACHE = 'osp-survey-pro-app-v6';
const MAP_CACHE = 'osp-survey-pro-maps-v1';

// App shell – MUST include entry module
const APP_SHELL = [
  './',
  './index.html',
  './index.tsx',
  './metadata.json',
  './sw.js'
];

// Install: cache core app files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(APP_CACHE).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: clean old caches
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

// Fetch handler
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // 1️⃣ Handle app navigation (CRITICAL)
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then(res => res || fetch(req))
    );
    return;
  }

  // 2️⃣ Cache map tiles (stale-while-revalidate)
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

  // 3️⃣ Cache-first for everything else (including CDN modules)
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;

      return fetch(req).then(networkRes => {
        if (
          networkRes &&
          networkRes.status === 200 &&
          (networkRes.type === 'basic' || networkRes.type === 'cors')
        ) {
          const clone = networkRes.clone();
          caches.open(APP_CACHE).then(cache => cache.put(req, clone));
        }
        return networkRes;
      });
    })
  );
});
