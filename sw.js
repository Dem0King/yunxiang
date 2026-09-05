// 云祥家具城 Service Worker
// 版本号，更新时修改此值会触发缓存更新
const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `yunxiang-${CACHE_VERSION}`;

// 需要缓存的静态资源
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/images/icon-192.png',
  '/images/icon-512.png'
];

// 安装事件 - 预缓存静态资源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('缓存静态资源');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// 请求拦截 - 网络优先策略
self.addEventListener('fetch', event => {
  const { request } = event;
  
  // 跳过非GET请求
  if (request.method !== 'GET') return;
  
  // 跳过API请求（GitHub API）
  if (request.url.includes('api.github.com')) return;
  
  // 跳过外部资源（CDN图片等）
  if (!request.url.startsWith(self.location.origin)) return;
  
  event.respondWith(
    fetch(request)
      .then(response => {
        // 网络请求成功，更新缓存
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // 网络失败，从缓存读取
        return caches.match(request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // 如果是页面请求，返回离线页面
          if (request.headers.get('accept').includes('text/html')) {
            return caches.match('/index.html');
          }
        });
      })
  );
});
