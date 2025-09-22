// sw.js  —— 版本 v3（改版本号可强制更新 SW）
const CACHE_STATIC = 'casei-static-v3';
const STATIC_ASSETS = [
  '/index.html',
  '/css/style.css',
  '/hero.jpg',
  '/product-1.jpg',
  '/product-2.jpg',
  '/product-3.jpg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_STATIC).then(c => c.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k !== CACHE_STATIC ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

// HTML（导航请求）走“网络优先”，避免旧首页长期卡住
self.addEventListener('fetch', (e) => {
  const req = e.request;

  // 对页面导航和 text/html 强制 network-first
  const isHTML =
    req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_STATIC).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('/index.html')))
    );
    return;
  }

  // 其他静态资源：cache-first
  e.respondWith(
    caches.match(req).then((cached) => {
      return (
        cached ||
        fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_STATIC).then((c) => c.put(req, copy));
          return res;
        })
      );
    })
  );
});