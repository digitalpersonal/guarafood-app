// src/serviceWorkerRegistration.ts

type Config = {
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
};

export function register(config?: Config) {
  if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
    // A URL do Service Worker no diretório public
    const swUrl = `/service-worker.js`;

    window.addEventListener('load', () => {
      registerValidSW(swUrl, config);
    });
  } else if ('serviceWorker' in navigator) {
    // Em desenvolvimento, também podemos registrar para testar
    const swUrl = `/service-worker.js`;
    window.addEventListener('load', () => {
      registerValidSW(swUrl, config);
    });
  }
}

function registerValidSW(swUrl: string, config?: Config) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      // Verifica se há um novo Service Worker esperando
      if (registration.waiting) {
        if (config && config.onUpdate) {
          config.onUpdate(registration);
        }
      }

      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // Novo conteúdo disponível, mas o antigo ainda está em uso
              console.log('Novo conteúdo disponível; por favor, atualize.');
              if (config && config.onUpdate) {
                config.onUpdate(registration);
              }
            } else {
              // Conteúdo em cache para uso offline
              console.log('Conteúdo em cache para uso offline.');
              if (config && config.onSuccess) {
                config.onSuccess(registration);
              }
            }
          }
        };
      };
    })
    .catch((error) => {
      console.error('Erro durante o registro do Service Worker:', error);
    });
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}
