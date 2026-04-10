const CACHE_NAME = 'metroflow-cache-v4';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Instalar Service Worker (Salvar em cache a estrutura base)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Interceptar Requisições de Rede (Offline-First local)
self.addEventListener('fetch', event => {
  // Ignora chamadas para firestore/google APIs para focar apenas em UI offline
  if (event.request.url.includes('firestore.googleapis.com') || event.request.url.includes('identitytoolkit')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Retorna o cache se houver. Se não, busca na rede.
        return response || fetch(event.request).then(fetchRes => {
          return caches.open(CACHE_NAME).then(cache => {
            // Guarda em cache de forma transparente a nova requisição local (assets, js, css)
            if (event.request.method === 'GET' && !event.request.url.includes('chrome-extension')) {
                cache.put(event.request, fetchRes.clone());
            }
            return fetchRes;
          });
        });
      }).catch(() => {
        // Fallback offline puro - direcionar pro root da SPA
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      })
  );
});

// Limpar Caches antigos na ativação
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});
