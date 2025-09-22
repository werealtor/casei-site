// Minimal Service Worker: network-first with cache fallback
const CACHE = 'casei-cache-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  // 清理旧缓存
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k !== CACHE ? caches.delete(k) : null)))
    ).then(() => self.clients.claim())
  );
});

// 同源 GET 请求：优先网络，失败回退缓存；成功后写入缓存（SWR）
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const isGET = req.method === 'GET';
  const sameOrigin = new URL(req.url).origin === self.location.origin;
  if (!isGET || !sameOrigin) return;

  e.respondWith((async () => {
    try {
      const net = await fetch(req);
      const cache = await caches.open(CACHE);
      cache.put(req, net.clone());
      return net;
    } catch {
      const cached = await caches.match(req);
      if (cached) return cached;
      // 简单文本兜底
      return new Response('You are offline.', {
        status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  })());
});