self.addEventListener('install', e=>{
  e.waitUntil(caches.open('casei-v1').then(c=>c.addAll([
    '/', '/index.html', '/prices.json',
    '/css/style.css', '/js/script.js'
  ])));
});
self.addEventListener('fetch', e=>{
  e.respondWith(caches.match(e.request).then(r=>r || fetch(e.request)));
});
