const CACHE_NAME = 'metroflow-cache-v6';
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

// Interceptar Requisições de Rede
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Ignorar chamadas para APIs externas e Firebase
  if (url.hostname.includes('firestore.googleapis.com') || 
      url.hostname.includes('identitytoolkit') || 
      url.hostname.includes('google.com')) {
    return;
  }

  // 2. Estratégia Network-First para Navegação (index.html)
  // Isso garante que SEMPRE buscaremos a versão mais nova do HTML antes de usar o cache.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          const indexCache = await caches.match('/index.html');
          if (indexCache) return indexCache;
          
          const rootCache = await caches.match('/');
          if (rootCache) return rootCache;
          
          return new Response('Network error and no cache available', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
          });
        })
    );
    return;
  }

  // 3. Estratégia Cache-First com fallback para Assets (JS, CSS, Imagens)
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then(networkResponse => {
        // Apenas faz cache de requisições GET bem sucedidas de arquivos locais
        if (request.method === 'GET' && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      });
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
