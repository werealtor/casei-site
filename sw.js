// Case&i — Service Worker v3
// 改进：
// 1) 跳过 Range 请求 & 媒体文件，解决视频播放和缓存冲突
// 2) 分类缓存策略：HTML 网络优先；CSS/JS/字体 SWR；其它网络优先回退缓存
// 3) 支持热更新：postMessage({type:'SKIP_WAITING'})

const CACHE = 'casei-cache-v3';
const PRECACHE = [
  '/', '/index.html',
  '/css/style.css',
  '/js/main.js',
  '/icon-192.png', '/icon-512.png'
];

// 安装：预缓存基础资源（尽量保持列表精简，避免 404 导致安装失败）
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).catch(()=>{})
  );
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 热更新：页面可发送 postMessage 让新 SW 立即接管
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 抓取：按类型应用策略
self.addEventListener('fetch', (e) => {
  const req = e.request;

  // 只处理 GET
  if (req.method !== 'GET') return;

  // 跳过 Range 请求（媒体流式播放常用）
  if (req.headers.has('range')) return;

  const url = new URL(req.url);
  const isHTML   = req.mode === 'navigate' || (req.destination === 'document');
  const isStatic = ['style', 'script', 'font'].includes(req.destination);
  const isMedia  = /\.(mp4|webm|ogg|mp3|wav)$/i.test(url.pathname);

  // 媒体文件交给浏览器直连，避免缓存/Range 问题
  if (isMedia) return;

  // HTML：网络优先，失败回退缓存
  if (isHTML) {
    e.respondWith((async () => {
      try {
        const net = await fetch(req, { cache: 'no-store' });
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
    return;
  }

  // 静态资源（CSS/JS/字体）：Stale-While-Revalidate
  if (isStatic) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req);
      const fetching = fetch(req).then(res => { cache.put(req, res.clone()); return res; }).catch(()=>null);
      return cached || (await fetching) || new Response('', { status: 504 });
    })());
    return;
  }

  // 其它：网络优先，失败回退缓存
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