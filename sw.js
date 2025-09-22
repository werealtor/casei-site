// 版本号（修改后会强制刷新缓存）
const CACHE_NAME = "casei-cache-v1";

// 需要缓存的资源（可根据你网站实际文件调整）
const URLS_TO_CACHE = [
  "/",                // 首页
  "/index.html",
  "/css/style.css",
  "/hero.jpg",
  "/product-1.jpg",
  "/product-2.jpg",
  "/product-3.jpg"
];

// 安装阶段：预缓存
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 激活阶段：清理旧缓存
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// 请求拦截：缓存优先，失败时走网络
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return (
        cachedResponse ||
        fetch(event.request).catch(() => {
          // 如果请求失败，返回一个简单的离线页面
          if (event.request.mode === "navigate") {
            return caches.match("/index.html");
          }
        })
      );
    })
  );
});