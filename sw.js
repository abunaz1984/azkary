/* Service worker for the azkar app: after the first visit the app opens without a network. */
const CACHE = 'azkary-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.add(new Request('./', { cache: 'reload' })))
      .catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Serve from cache right away, refresh the cache in the background (a new version shows on the next launch).
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    let cached = await cache.match(req, { ignoreSearch: true });
    if (!cached && req.mode === 'navigate') cached = await cache.match('./');

    const refresh = fetch(req).then((res) => {
      if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    });

    if (cached) {
      event.waitUntil(refresh.catch(() => {}));
      return cached;
    }
    try {
      return await refresh;
    } catch (err) {
      return new Response('Нет сети. Откройте приложение один раз с интернетом.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  })());
});
