const CACHE_NAME = 'guarafood-v1.1.1';
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

  // Estratégia: Network First para HTML e assets principais, Cache First para o resto
  // Isso garante que o usuário sempre receba a versão mais nova se estiver online
  if (request.mode === 'navigate' || STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Estratégia Stale-While-Revalidate para outros assets
  event.respondWith(
    caches.match(request).then((response) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
        }
        return networkResponse;
      }).catch(() => {});

      return response || fetchPromise;
    })
  );
});

// Escuta mensagens do frontend (ex: comando para pular espera)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
