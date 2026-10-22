const CACHE_NAME = 'emm-rapports-v3-' + Date.now();
const URLS = ['./','./index.html','./style.css','./app.js','./db.js','./manifest.json','./icon-192.png','./icon-512.png'];

self.addEventListener('install', function(event) {
  event.waitUntil(caches.open(CACHE_NAME).then(function(cache) { return cache.addAll(URLS).catch(function() { return Promise.all(URLS.map(function(url) { return cache.add(url).catch(function() {}); })); }); }));
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(caches.keys().then(function(keys) { return Promise.all(keys.filter(function(k) { return k !== CACHE_NAME; }).map(function(k) { return caches.delete(k); })); }));
  self.clients.claim();
});

self.addEventListener('fetch', function(event) {
  event.respondWith(caches.match(event.request).then(function(cached) { if (cached) return cached; return fetch(event.request).then(function(response) { if (response && response.status === 200 && event.request.method === 'GET') { var rc = response.clone(); caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, rc); }); } return response; }).catch(function() { return caches.match('./index.html'); }); }));
});
