const CACHE_NAME = 'guarafood-v1.0.4';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/vite.svg',
  '/index.css',
  // Note: Vite hashed assets will be added dynamically if we were using a build tool,
  // but for a manual SW, we'll focus on the core shell and strategy.
];

// 1. Instalação: skipWaiting força o novo SW a se tornar ativo imediatamente
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching offline shell');
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// 2. Ativação: clients.claim assume o controle das abas abertas imediatamente
// Também remove caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[Service Worker] Removing old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

// 3. Estratégia de Fetch
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar chamadas de API (Supabase, GenAI) - Network First
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api') || url.pathname.includes('supabase.co')) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // Estratégia Cache First para Assets Estáticos, Network First para o resto
  event.respondWith(
    caches.match(request).then((response) => {
      if (response) {
        // Se estiver no cache, retorna, mas tenta atualizar em background (Stale-While-Revalidate)
        fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
          }
        }).catch(() => {});
        return response;
      }

      return fetch(request).then((networkResponse) => {
        // Salva no cache se for um asset válido
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
        }
        return networkResponse;
      });
    })
  );
});

// Escuta mensagens do frontend (ex: comando para pular espera)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
