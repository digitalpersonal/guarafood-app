// Nome do Cache - Versão atualizada para forçar refresh
const CACHE_NAME = 'guarafood-v2';

// Arquivos para cachear imediatamente (App Shell)
const urlsToCache = [
  '/',
  '/index.html',
  '/vite.svg',
  '/manifest.json'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Ativação e limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estratégia de Fetch: Network First (Tenta internet, se falhar usa cache)
// Para APIs do Supabase, sempre tenta internet
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Não cachear chamadas de API/Supabase para garantir dados frescos
  if (url.href.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Se a resposta for válida, clona e atualiza o cache
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME)
          .then((cache) => {
            cache.put(event.request, responseToCache);
          });
        return response;
      })
      .catch(() => {
        // Se falhar (offline), tenta pegar do cache
        return caches.match(event.request);
      })
  );
});