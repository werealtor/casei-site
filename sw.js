// Case&i — Service Worker (v10)
// Strategy: network-first with cache fallback + versioned cache

const CACHE = 'casei-cache-v36';
const PRECACHE = [
  '/', '/index.html',
  '/css/style.css',
  '/js/main.js',
  '/prices.json',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  // 资源较大/可选：按需启用
  // '/assets/videos/hero.mp4',
];

// ----- install: 预缓存基础资源 -----
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).catch(() => {})
  );
  self.skipWaiting();
});

// ----- activate: 清理旧缓存 -----
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ----- fetch: 同源请求走网络优先，失败回退缓存 -----
// 同时对导航请求提供离线兜底，对图片给 1px 占位，其他用简单文本
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // 仅对同源资源接管
  if (!sameOrigin) return;

  event.respondWith((async () => {
    try {
      const net = await fetch(req);
      // 仅缓存成功的基本同源响应
      if (net && net.status === 200 && net.type === 'basic') {
        const cache = await caches.open(CACHE);
        cache.put(req, net.clone());
      }
      return net;
    } catch (err) {
      // 网络失败 → 回退缓存
      const cached = await caches.match(req);
      if (cached) return cached;

      // 导航/HTML 兜底
      const accept = req.headers.get('accept') || '';
      if (accept.includes('text/html')) {
        const fallback = await caches.match('/index.html');
        if (fallback) return fallback;
      }

      // 图片兜底：返回 1px 透明 PNG
      if (req.destination === 'image') {
        const onePx =
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
        return new Response(
          Uint8Array.from(atob(onePx), c => c.charCodeAt(0)),
          { headers: { 'Content-Type': 'image/png' } }
        );
      }

      // 其他类型：简单离线提示
      return new Response('You are offline.', {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  })());
});
