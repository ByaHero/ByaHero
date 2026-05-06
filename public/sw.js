const CACHE_NAME = "byahero-v3";

// Core app shell — cached on install for instant repeat loads
const APP_SHELL = [
  "/manifest.webmanifest",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

// CDN assets to cache on first fetch (stale-while-revalidate)
const CDN_ORIGINS = [
  "fonts.googleapis.com",
  "fonts.gstatic.com",
  "cdn.jsdelivr.net",
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET requests
  if (req.method !== "GET") return;

  // CDN assets (Bootstrap CSS/JS, Google Fonts, Leaflet) — cache-first
  if (CDN_ORIGINS.some(origin => url.hostname.includes(origin))) {
    event.respondWith(
      caches.match(req).then(cached => {
        // Return cached immediately, but also update cache in background
        const fetchPromise = fetch(req).then(networkRes => {
          if (networkRes.ok) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          }
          return networkRes;
        }).catch(() => cached); // If offline, stick with cached

        return cached || fetchPromise;
      })
    );
    return;
  }

  // Local static assets (images, CSS, JS files) — cache-first
  if (/\.(css|js|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot)(\?.*)?$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(networkRes => {
          if (networkRes.ok) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          }
          return networkRes;
        });
      })
    );
    return;
  }

  // PHP pages and API calls — network-first (always fresh)
  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});