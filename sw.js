const CACHE_NAME = "sonora-shell-v2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./css/sonora.css",
  "./js/sonora.js",
  "./manifest.webmanifest",
  "./sonora-icon.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(keys => Promise.all(
        keys.filter(key => key.startsWith("sonora-") && key !== CACHE_NAME).map(key => caches.delete(key))
      )),
      self.clients.claim()
    ])
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(event.request).then(cached => cached || fetch(event.request).then(response => {
        if (response.ok) {
          cache.put(event.request, response.clone());
        }
        return response;
      }))
    )
  );
});
