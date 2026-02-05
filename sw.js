const CACHE_NAME = 'treino-app-v1.0.0';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './main.js',
  './database.json',
  './manifest.json'
];

// Instalação - cria o cache inicial
self.addEventListener('install', event => {
  console.log('[SW] Instalando nova versão...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => {
        console.log('[SW] Cache inicial criado');
        // Força ativação imediata (skip waiting)
        return self.skipWaiting();
      })
  );
});

// Ativação - limpa caches antigos
self.addEventListener('activate', event => {
  console.log('[SW] Ativando nova versão...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Nova versão ativada');
      // Garante controle imediato de todos os clientes
      return self.clients.claim();
    })
  );
});

// Estratégia de cache: Network First com fallback para cache
self.addEventListener('fetch', event => {
  // Ignora requisições de chrome-extension e outras não-HTTP
  if (!event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Se a requisição foi bem sucedida, atualiza o cache
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Se falhar a rede, tenta o cache
        return caches.match(event.request)
          .then(response => {
            if (response) {
              console.log('[SW] Servindo do cache:', event.request.url);
              return response;
            }
            // Se não encontrar no cache, retorna página offline
            if (event.request.destination === 'document') {
              return caches.match('./index.html');
            }
          });
      })
  );
});

// Comunicação com o cliente para atualizações
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
