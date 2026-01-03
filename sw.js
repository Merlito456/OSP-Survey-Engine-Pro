const APP_CACHE = 'osp-survey-pro-app-v7';
const MAP_CACHE = 'osp-survey-pro-maps-v1';

// Detect host
const IS_GITHUB_PAGES = self.location.hostname.endsWith('github.io');

// Pick correct entry file
const ENTRY_FILE = IS_GITHUB_PAGES
  ? './index.js'   // GitHub Pages
  : './index.tsx'; // Netlify

// App shell (HOST-AWARE)
const APP_SHELL = [
  './',
  './index.html',
  ENTRY_FILE,
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

  // 🚫 Never serve TSX on GitHub Pages
  if (IS_GITHUB_PAGES && url.pathname.endsWith('.tsx')) {
    return;
  }

  // 1️⃣ Navigation requests → app shell
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

  // 3️⃣ Everything else (cache-first + populate)
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
