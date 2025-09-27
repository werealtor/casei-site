// Case&i — Optimized SW (network-first with cache fallback, versioning, and expiration)
const CACHE_VERSION = 'v2'; // 版本化缓存名称，便于更新时清理旧版
const CACHE = `casei-cache-${CACHE_VERSION}`;
const PRECACHE = [
  '/', '/index.html',
  '/css/style.css',
  '/js/main.js',
  // 扩展预缓存静态资源，提高首次加载速度
  '/assets/videos/hero.mp4',
  '/assets/videos/hero.webm',
  '/assets/images/classic/1.jpg',
  '/assets/images/classic/2.jpg',
  '/assets/images/classic/3.jpg',
  '/assets/images/fashion/1.jpg',
  '/assets/images/fashion/2.jpg',
  '/assets/images/fashion/3.jpg',
  '/assets/images/business/1.jpg',
  '/assets/images/business/2.jpg',
  '/assets/images/business/3.jpg',
  '/assets/images/hero-poster.jpg',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.webmanifest'
];

// install：预缓存基础资源
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).catch((err) => console.warn('Precache failed:', err))
  );
  self.skipWaiting(); // 立即激活新SW
});

// activate：清理旧缓存，并处理更新
self.addEventListener('activate', (e) => {
  e.waitUntil(
    Promise.all([
      caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
      ),
      // 通知客户端更新（可选：发送消息给客户端刷新）
      self.clients.claim().then(() => {
        return self.clients.matchAll({ type: 'window' }).then(clients => {
          clients.forEach(client => client.postMessage({ type: 'UPDATE_AVAILABLE' }));
        });
      })
    ])
  );
});

// fetch：网络优先，失败回退缓存；成功后写入缓存，并添加过期逻辑
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const net = await fetch(req);
      // 更新缓存，并设置过期时间（例如1天）
      const cloned = net.clone();
      const responseWithExpiry = new Response(cloned.body, {
        status: net.status,
        statusText: net.statusText,
        headers: net.headers
      });
      responseWithExpiry.headers.set('sw-cache-expires', Date.now() + 86400000); // 1天过期
      cache.put(req, responseWithExpiry);
      return net;
    } catch {
      const hit = await cache.match(req);
      if (hit) {
        // 检查缓存是否过期
        const expiry = hit.headers.get('sw-cache-expires');
        if (expiry && Date.now() > parseInt(expiry)) {
          cache.delete(req); // 删除过期缓存
          return new Response('Cache expired.', { status: 504 });
        }
        return hit;
      }
      return new Response('You are offline.', {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  })());
});