const CACHE_NAME = 'ai-research-v2';
// Assets to cache on install. This provides the basic offline app shell.
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  // Data files for offline access
  '/src/data/featuredAuthors.json',
  '/src/data/featuredJournals.json',
  // Key CDN assets from importmap
  "https://aistudiocdn.com/react@^19.1.1",
  "https://aistudiocdn.com/react-dom@^19.1.1/client",
  "https://aistudiocdn.com/@google/genai@^1.19.0",
  "https://aistudiocdn.com/dexie@^4.0.7",
  "https://aistudiocdn.com/marked@^13.0.2",
  "https://aistudiocdn.com/dompurify@^3.1.6",
  "https://aistudiocdn.com/chart.js@^4.4.3",
  "https://aistudiocdn.com/react-chartjs-2@^5.2.0",
  "https://aistudiocdn.com/jspdf@^2.5.1",
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
  self.skipWaiting();
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
    }).then(() => self.clients.claim())
  );
});

// Event: fetch
// Serves requests from cache or network, implementing a cache-first strategy
// for static assets and a network-first strategy for APIs.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Use a network-first strategy for API calls to ensure fresh data.
  // Fallback to cache if offline.
  if (url.hostname.includes('ncbi.nlm.nih.gov')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // If the fetch is successful, clone it and cache it.
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(async () => {
          // If the network fails, try to serve from the cache.
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // If not in cache either, return a generic error response.
          return new Response('Network error and no cache available.', {
            status: 408,
            statusText: 'Request Timeout',
            headers: { 'Content-Type': 'text/plain' },
          });
        })
    );
    return;
  }
  
  // Use a cache-first strategy for all other requests (app files, CDN assets).
  event.respondWith(
    caches.match(request)
      .then((response) => {
        // Cache hit - return response from cache.
        if (response) {
          return response;
        }
        
        // Not in cache - fetch from network and cache it for next time.
        return fetch(request).then(
          (response) => {
            // Check if we received a valid response.
            if (!response || response.status !== 200 || response.type === 'opaque') {
              return response;
            }
            
            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            if (request.method === 'GET') {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, responseToCache);
                });
            }

            return response;
          }
        );
      })
      .catch(error => {
        console.error('Service Worker: Error in fetch handler:', error);
        // If there's an error (e.g., offline and not in cache),
        // for navigation requests, serve the index.html as a fallback.
        if (request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        // For other requests, just let the error propagate.
        throw error;
      })
  );
});