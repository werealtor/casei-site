// sw.js — safe version
const VERSION = 'v3';
const CACHE = `casei-cache-${VERSION}`;

// 只预缓存框架文件；图片不预缓存（避免大体积与更新问题）
const PRECACHE = [
  '/', '/index.html',
  '/css/style.css',
  '/js/main.js'
];

// ===== Install：预缓存 =====
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).catch(() => {})
  );
  self.skipWaiting();
});

// ===== Activate：清旧缓存 & 打开导航预加载（可用时）=====
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    if ('navigationPreload' in self.registration) {
      try { await self.registration.navigationPreload.enable(); } catch {}
    }
  })());
  self.clients.claim();
});

// ===== Helpers：不同资源不同策略 =====
const isSameOrigin = (url) => url.origin === self.location.origin;

async function networkFirst(req) {
  try {
    const net = await fetch(req);
    const c = await caches.open(CACHE);
    c.put(req, net.clone());
    return net;
  } catch (err) {
    const hit = await caches.match(req);
    return hit || new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(req) {
  const c = await caches.open(CACHE);
  const cached = await c.match(req);
  const fetchPromise = fetch(req).then(net => { c.put(req, net.clone()); return net; }).catch(() => null);
  return cached || (await fetchPromise) || new Response('Offline', { status: 503 });
}

async function cacheFirst(req) {
  const c = await caches.open(CACHE);
  const cached = await c.match(req);
  if (cached) return cached;
  try {
    const net = await fetch(req);
    c.put(req, net.clone());
    return net;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

// ===== Fetch：同源 GET 才拦；分类型策略 =====
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (!isSameOrigin(url)) return; // 跨域请求不拦，直接走网络

  // HTML（导航请求）：网络优先
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    e.respondWith(networkFirst(req));
    return;
  }

  // 样式和脚本：SWR（先用缓存，后台更新）
  if (url.pathname.endsWith('.css') || url.pathname.endsWith('.js')) {
    e.respondWith(staleWhileRevalidate(req));
    return;
  }

  // 图片：缓存优先（命中即回，未命中再取）
  if (/\.(png|jpe?g|gif|webp|svg|ico)$/i.test(url.pathname)) {
    e.respondWith(cacheFirst(req));
    return;
  }

  // 其他同源资源：SWR
  e.respondWith(staleWhileRevalidate(req));
});