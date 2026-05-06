const CACHE_NAME = 'metroflow-cache-v7';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Ignorar APIs, Auth, etc.
  if (url.hostname.includes('firestore.googleapis.com') || 
      url.hostname.includes('identitytoolkit') || 
      url.hostname.includes('google.com')) {
    return;
  }

  // 2. Estratégia Network-First global com fallback seguro
  event.respondWith(
    fetch(request)
      .then(response => {
        // Copia a resposta para o cache se for GET
        if (request.method === 'GET' && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        // Se a rede falhar, tenta buscar exatamente o que foi pedido no cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) return cachedResponse;

        // Se for navegação e não tiver no cache, tenta o index.html
        if (request.mode === 'navigate') {
          const indexCache = await caches.match('/index.html');
          if (indexCache) return indexCache;
        }

        // Último recurso: retorna uma resposta de erro válida para não quebrar a Promise do FetchEvent
        return new Response('Offline: Recurso indisponível', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({ 'Content-Type': 'text/plain' })
        });
      })
  );
});
