// Self-Destruct & Immediate Re-Sync Service Worker
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    })
    .then(() => self.clients.claim())
    .then(() => self.clients.matchAll())
    .then((clients) => {
      clients.forEach((client) => {
        client.navigate(client.url);
      });
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Always fetch live network directly
  event.respondWith(fetch(event.request));
});
