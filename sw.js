// sw.js — Case&i SW (network-first + cache fallback)
const CACHE = 'casei-cache-v9'; // ← 改这个版本号可强制更新

const PRECACHE = [
  '/', '/index.html',
  '/css/style.css',
  '/js/main.js',
  '/icon-192.png', '/icon-512.png',
  '/manifest.webmanifest'
];

// 安装：预缓存基础资源
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).catch(()=>{})
  );
  self.skipWaiting(); // 让新 SW 立即进入 waiting
});

// 激活：清理旧缓存
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim(); // 立刻接管页面
});

// 前端可发送 {type:'SKIP_WAITING'} 让新 SW 立即接管
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 获取：网络优先，失败用缓存（跳过大媒体与 Range 请求）
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // 跳过 Range 请求（视频音频拖动）
  if (req.headers.has('range')) return;

  const url = new URL(req.url);

  // 可选：跳过大媒体文件，避免缓存爆掉
  if (/\.(mp4|webm|ogv|ogg|mp3|wav)$/i.test(url.pathname)) return;

  e.respondWith((async () => {
    try {
      // 网络优先
      const net = await fetch(req, { cache: 'no-store' });
      // 成功后写入缓存
      const cache = await caches.open(CACHE);
      cache.put(req, net.clone());
      return net;
    } catch {
      // 失败回退缓存
      const hit = await caches.match(req);
      return hit || new Response('You are offline.', {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  })());
});
