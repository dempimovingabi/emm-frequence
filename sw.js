const CACHE_NAME = 'emm-freq-cache-v1';

// Liste des fichiers à mettre en cache pour le fonctionnement hors ligne
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
  // Ajoutez ici vos fichiers CSS et JS principaux, ex:
  // '/css/style.css',
  // '/js/app.js'
];

// 1. Installation du Service Worker et mise en cache des fichiers
self.addEventListener('install', event => {
  self.skipWaiting(); // Force le nouveau SW à prendre le contrôle immédiatement
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Ouverture du cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. Activation et nettoyage des anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Suppression de l\'ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// 3. Interception des requêtes : sert le cache ou va sur le réseau
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si le fichier est dans le cache, on le renvoie
        if (response) {
          return response;
        }
        // Sinon, on va le chercher sur le réseau
        return fetch(event.request).then(
          function(response) {
            // Vérifier si nous avons reçu une réponse valide
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            // Mettre en cache la nouvelle ressource pour la prochaine fois
            var responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              });
            return response;
          }
        );
      })
  );
});