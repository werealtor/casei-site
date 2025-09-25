// Case&i — Minimal SW (network-first with cache fallback)
const CACHE = 'casei-cache-v1';
const PRECACHE = [
  '/', '/index.html',
  '/css/style.css',
  '/js/main.js',
  // 你也可以把静态资源加进来（可选）
  // '/assets/videos/hero.mp4',
  // '/assets/images/classic.jpg',
  // '/assets/images/fashion.jpg',
  // '/assets/images/business.jpg',
];

// install：预缓存基础资源
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).catch(()=>{})
  );
  self.skipWaiting();
});

// activate：清理旧缓存
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// fetch：网络优先，失败回退缓存；成功后写入缓存
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  e.respondWith((async () => {
    try {
      const net = await fetch(req);
      const cache = await caches.open(CACHE);
      cache.put(req, net.clone());
      return net;
    } catch {
      const hit = await caches.match(req);
      return hit || new Response('You are offline.', {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  })());
});