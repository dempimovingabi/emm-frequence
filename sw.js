const CACHE = 'emm-frequence-v3';
const FILES = ['index.html','style.css','app.js','manifest.json','logos/logo.png','logos/logo-entete.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES).catch(()=>{})));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))
  ));
});
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
      return caches.open(CACHE).then(c => { c.put(e.request, resp.clone()); return resp; });
    }).catch(()=>caches.match('index.html')))
  );
});