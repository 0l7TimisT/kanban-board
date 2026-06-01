const CACHE_NAME = 'kanban-v1';
const RUNTIME_CACHE = 'kanban-runtime-v1';

const PRECACHE_URLS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/classes/Board.js',
  './js/classes/Column.js',
  './js/classes/Card.js',
  './js/classes/DragController.js',
  './js/classes/HistoryManager.js',
  './js/components/KanbanCard.js',
  './js/utils/storage.js',
  './js/utils/audio.js',
  './js/pages/BoardPage.js',
  './js/pages/ArchivePage.js',
  './js/pages/StatsPage.js',
  './js/pages/SettingsPage.js',
  './data/sample-board.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching aplikace');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error('[SW] Precaching selhalo:', error);
      })
  );
});

self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_NAME, RUNTIME_CACHE];
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return cacheNames.filter(name => !currentCaches.includes(name));
      })
      .then((cachesToDelete) => {
        return Promise.all(
          cachesToDelete.map(name => {
            console.log('[SW] Mažu starou cache:', name);
            return caches.delete(name);
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  if (url.origin !== self.location.origin) return;
  
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          fetchAndUpdateCache(event.request);
          return cachedResponse;
        }
        
        return fetch(event.request)
          .then((response) => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            const responseToCache = response.clone();
            caches.open(RUNTIME_CACHE)
              .then((cache) => cache.put(event.request, responseToCache));
            
            return response;
          })
          .catch(() => {
            if (event.request.destination === 'document') {
              return caches.match('./index.html');
            }
            return new Response('Offline', { 
              status: 503, 
              statusText: 'Service Unavailable' 
            });
          });
      })
  );
});

function fetchAndUpdateCache(request) {
  fetch(request)
    .then((response) => {
      if (!response || response.status !== 200) return;
      
      const responseToCache = response.clone();
      caches.open(RUNTIME_CACHE)
        .then((cache) => cache.put(request, responseToCache));
    })
    .catch(() => {});
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys()
      .then((names) => Promise.all(names.map(name => caches.delete(name))))
      .then(() => {
        if (event.ports[0]) {
          event.ports[0].postMessage({ success: true });
        }
      });
  }
});
