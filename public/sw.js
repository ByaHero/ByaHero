const CACHE_NAME = "byahero-v2";
const APP_SHELL = [
  "/passenger/index.php",
  "/conductor/conductor.php",
  "/ADMIN/admin.php",
  "/manifest.webmanifest",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded",
  "https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  // Add more static dependencies as needed
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

// Cache-first for app shell; network-first for others
self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);

  if (APP_SHELL.some(path => url.pathname.endsWith(path))) {
    // Cache-first for known assets
    event.respondWith(
      caches.match(req).then(res => res || fetch(req))
    );
  } else {
    // Network-first for everything else (API, dynamic)
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
  }
});