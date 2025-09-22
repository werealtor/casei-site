// sw.js
const CACHE = 'casei-v1';
const ASSETS = [
  '/',                // 根路径（自定义域名建议保留）
  '/index.html',
  '/css/style.css',
  '/js/script.js',
  '/assets/images/classic.jpg',
  '/assets/images/fashion.jpg',
  '/assets/images/business.jpg',
  '/assets/images/hero-poster.jpg',
  '/assets/videos/hero.mp4'
];

// 安装：预缓存核心资源
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

// 请求：缓存优先，网络兜底
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

// 激活：清理旧缓存
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});