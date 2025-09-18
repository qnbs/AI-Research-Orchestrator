const CACHE_NAME = 'pwa-cache-v1';

// App Shell: The minimal resources needed for the app to start.
const APP_SHELL_URLS = [
  '/',
  '/index.html',
  '/index.tsx',
  // Insert the icon data URI from icon_uri.txt here, enclosed in quotes
  "data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='iconGradient' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%231f6feb;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%2339c5f7;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Cg stroke='url(%23iconGradient)' stroke-width='5' stroke-linecap='round' fill='none'%3E%3Cpath d='M50 25 L71.65 37.5 L71.65 62.5 L50 75 L28.35 62.5 L28.35 37.5 Z' /%3E%3Cline x1='50' y1='25' x2='50' y2='5' /%3E%3Cline x1='71.65' y1='37.5' x2='89.3' y2='29' /%3E%3Cline x1='71.65' y1='62.5' x2='89.3' y2='71' /%3E%3Cline x1='50' y1='75' x2='50' y2='95' /%3E%3Cline x1='28.35' y1='62.5' x2='10.7' y2='71' /%3E%3Cline x1='28.35' y1='37.5' x2='10.7' y2='29' /%3E%3C/g%3E%3Cg fill='url(%23iconGradient)'%3E%3Ccircle cx='50' cy='5' r='5' /%3E%3Ccircle cx='89.3' cy='29' r='5' /%3E%3Ccircle cx='89.3' cy='71' r='5' /%3E%3Ccircle cx='50' cy='95' r='5' /%3E%3Ccircle cx='10.7' cy='71' r='5' /%3E%3Ccircle cx='10.7' cy='29' r='5' /%3E%3C/g%3E%3C/svg%3E"
];

// Third-party resources to cache
const THIRD_PARTY_URLS = [
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap',
  'https://esm.sh/react@^19.1.1',
  'https://esm.sh/react-dom@^19.1.1',
  'https://esm.sh/react-dom@^19.1.1/client',
  'https://esm.sh/@google/genai@^1.15.0',
  'https://aistudiocdn.com/uuid@^13.0.0'
];

const urlsToCache = [...APP_SHELL_URLS, ...THIRD_PARTY_URLS];

// Install event: cache the app shell and third-party resources.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Pre-caching App Shell');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('[Service Worker] Failed to cache App Shell:', error);
      })
  );
});

// Activate event: clean up old caches.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event: serve from cache, falling back to network.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
      return;
  }
  
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(event.request);
      if (cachedResponse) {
        return cachedResponse;
      }

      try {
        const networkResponse = await fetch(event.request);
        if (networkResponse && networkResponse.status === 200 && !event.request.url.startsWith('chrome-extension://')) {
          await cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      } catch (error) {
        console.error('[Service Worker] Fetch failed:', error);
        if (event.request.mode === 'navigate') {
            const indexPage = await cache.match('/index.html');
            if (indexPage) return indexPage;
        }
        return new Response(null, { status: 500, statusText: "Service Worker fetch failed" });
      }
    })
  );
});
