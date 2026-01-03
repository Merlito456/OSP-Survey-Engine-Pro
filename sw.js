const APP_CACHE = 'osp-app-v6';
const TILE_CACHE = 'osp-map-tiles-v1';

// Cache ONLY local build assets
const PRECACHE = [
  './index.html',
  './manifest.json',
];

// ---------- INSTALL ----------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// ---------- ACTIVATE ----------
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

// ---------- FETCH ----------
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 🚫 Ignore non-GET
  if (req.method !== 'GET') return;

  // 🗺️ OpenStreetMap tiles (cache-first)
  if (url.hostname.includes('tile.openstreetmap.org')) {
    event.respondWith(
      caches.open(TILE_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;

        const fresh = await fetch(req);
        cache.put(req, fresh.clone());
        return fresh;
      })
    );
    return;
  }

  // 🧭 SPA navigation — NETWORK FIRST
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          caches.open(APP_CACHE).then((c) => c.put('./index.html', res.clone()));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 📦 Static assets — CACHE FIRST
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});
