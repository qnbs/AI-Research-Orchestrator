const CACHE_NAME = 'ai-research-v1';
// Assets to cache on install. This provides the basic offline app shell.
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/index.tsx',
  '/src/App.tsx',
  '/data/featuredAuthors.json',
  '/data/featuredJournals.json',
  // Key CDN assets. The fetch handler will cache others dynamically.
  'https://aistudiocdn.com/react@^19.1.1',
  'https://aistudiocdn.com/react-dom@^19.1.1/client',
  'https://aistudiocdn.com/dexie@^4.2.0',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Roboto:wght@400;500;700&display=swap',
];

// Event: install
// Caches core application assets.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Service Worker: Failed to cache app shell:', error);
      })
  );
});

// Event: activate
// Cleans up old caches to ensure the user always has the latest version.
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Event: fetch
// Serves requests from cache or network, implementing a cache-first strategy
// for static assets and a network-first strategy for APIs.
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Use a network-first strategy for API calls to ensure fresh data.
  // Fallback to cache if offline.
  if (requestUrl.hostname.includes('ncbi.nlm.nih.gov')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // Network failed, try the cache
          return caches.match(event.request);
        })
    );
    return;
  }

  // Use a cache-first strategy for all other requests (app files, CDN assets).
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response from cache.
        if (response) {
          return response;
        }
        
        // Not in cache - fetch from network and cache it for next time.
        return fetch(event.request).then(
          (response) => {
            // Check if we received a valid response.
            // Don't cache opaque responses (e.g., no-cors requests to third-party CDNs).
            if (!response || response.status !== 200 || response.type === 'opaque') {
              return response;
            }
            
            if (event.request.method === 'GET') {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
            }

            return response;
          }
        );
      })
  );
});
