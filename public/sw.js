const APP_CACHE = 'osp-app-v7';
const TILE_CACHE = 'osp-map-tiles-v1';

// Only precache files that ALWAYS exist
const PRECACHE = [
  './index.html',
  './manifest.json',
];

// ---------------- INSTALL ----------------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// ---------------- ACTIVATE ----------------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![APP_CACHE, TILE_CACHE].includes(key))
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ---------------- FETCH ----------------
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET requests
  if (req.method !== 'GET') return;

  // ---------------- MAP TILES ----------------
  // Cache OpenStreetMap tiles (cache-first)
  if (url.hostname.includes('tile.openstreetmap.org')) {
    event.respondWith(
      caches.open(TILE_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;

        try {
          const fresh = await fetch(req);
          cache.put(req, fresh.clone());
          return fresh;
        } catch {
          return cached;
        }
      })
    );
    return;
  }

  // ---------------- SPA NAVIGATION ----------------
  // THIS IS THE CRITICAL FIX FOR /assets/ 404
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // If the response is NOT OK (404, 500, etc)
          // always fall back to index.html
          if (!res || !res.ok) {
            return caches.match('./index.html');
          }
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // ---------------- STATIC ASSETS ----------------
  // JS / CSS / images — cache first
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});