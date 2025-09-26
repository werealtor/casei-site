// sw.js — safe cache strategies
const VERSION = 'v3';
const CACHE = `casei-cache-${VERSION}`;
const PRECACHE = [
  '/', '/index.html',
  '/css/style.css',
  '/js/main.js'
];

// install: pre-cache base files
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).catch(()=>{}));
  self.skipWaiting();
});

// activate: clean old cache & enable navigation preload if available
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

const isSameOrigin = (url) => url.origin === self.location.origin;

async function networkFirst(req) {
  try {
    const net = await fetch(req);
    const c = await caches.open(CACHE);
    c.put(req, net.clone());
    return net;
  } catch {
    const hit = await caches.match(req);
    return hit || new Response('Offline', { status: 503 });
  }
}
async function staleWhileRevalidate(req) {
  const c = await caches.open(CACHE);
  const cached = await c.match(req);
  const fetchP = fetch(req).then(r => { c.put(req, r.clone()); return r; }).catch(()=>null);
  return cached || (await fetchP) || new Response('Offline', { status: 503 });
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

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (!isSameOrigin(url)) return; // don't intercept cross-origin

  // HTML
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    e.respondWith(networkFirst(req)); return;
  }
  // CSS/JS
  if (url.pathname.endsWith('.css') || url.pathname.endsWith('.js')) {
    e.respondWith(staleWhileRevalidate(req)); return;
  }
  // Images
  if (/\.(png|jpe?g|gif|webp|svg|ico)$/i.test(url.pathname)) {
    e.respondWith(cacheFirst(req)); return;
  }
  // others
  e.respondWith(staleWhileRevalidate(req));
});