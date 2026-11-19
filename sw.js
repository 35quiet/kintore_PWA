/* 筋トレ管理 Service Worker: ネットワーク優先・失敗時にキャッシュ(更新を取り込みやすく、オフラインでも起動) */
const CACHE = 'kintore-v1.4.1';
const FILES = ['./', 'index.html', 'style.css', 'data.js', 'core.js', 'charts.js', 'views1.js', 'views2.js', 'main.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
