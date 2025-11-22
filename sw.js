
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

if (workbox) {
    workbox.setConfig({ debug: false });

    // Take control immediately
    workbox.core.clientsClaim();
    self.skipWaiting();

    // Cleanup old caches from previous versions
    workbox.precaching.cleanupOutdatedCaches();

    const { registerRoute, setCatchHandler } = workbox.routing;
    const { NetworkFirst, CacheFirst, StaleWhileRevalidate } = workbox.strategies;
    const { CacheableResponsePlugin } = workbox.cacheableResponse;
    const { ExpirationPlugin } = workbox.expiration;

    // --- 1. Navigation (App Shell) ---
    // Strategy: Network First -> Cache Fallback.
    // Optimized: Ensure HTML serves 200 OK before caching.
    registerRoute(
        ({ request }) => request.mode === 'navigate',
        new NetworkFirst({
            cacheName: 'pages-cache',
            plugins: [
                new CacheableResponsePlugin({ statuses: [0, 200] }),
            ],
        })
    );

    // --- 2. Critical Data (PubMed API) ---
    // Strategy: Network First (Fresh Data Priority)
    // Optimization: Short timeout (5s) to prevent hanging on slow connections.
    registerRoute(
        ({ url }) => url.hostname.includes('ncbi.nlm.nih.gov'),
        new NetworkFirst({
            cacheName: 'pubmed-api-cache',
            networkTimeoutSeconds: 5,
            plugins: [
                new CacheableResponsePlugin({ statuses: [0, 200] }),
                new ExpirationPlugin({
                    maxEntries: 200,
                    maxAgeSeconds: 60 * 60 * 24 * 7, // 1 week
                    purgeOnQuotaError: true,
                }),
            ],
        })
    );

    // --- 3. CDN Libraries (JS/CSS) ---
    // Strategy: StaleWhileRevalidate (Speed Priority)
    // Optimization: Long cache life for immutable libraries.
    registerRoute(
        ({ url }) =>
            url.origin.includes('aistudiocdn.com') ||
            url.origin.includes('cdn.tailwindcss.com'),
        new StaleWhileRevalidate({
            cacheName: 'cdn-resources',
            plugins: [
                new CacheableResponsePlugin({ statuses: [0, 200] }),
                new ExpirationPlugin({
                    maxEntries: 50,
                    maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                }),
            ],
        })
    );

    // --- 4. Google Fonts ---
    // Stylesheets: StaleWhileRevalidate
    registerRoute(
        ({ url }) => url.origin === 'https://fonts.googleapis.com',
        new StaleWhileRevalidate({
            cacheName: 'google-fonts-stylesheets',
        })
    );

    // Webfonts: CacheFirst (Immutable)
    registerRoute(
        ({ url }) => url.origin === 'https://fonts.gstatic.com',
        new CacheFirst({
            cacheName: 'google-fonts-webfonts',
            plugins: [
                new CacheableResponsePlugin({ statuses: [0, 200] }),
                new ExpirationPlugin({
                    maxAgeSeconds: 60 * 60 * 24 * 365,
                    maxEntries: 30,
                }),
            ],
        })
    );

    // --- 5. Local Static Assets ---
    registerRoute(
        ({ request, url }) =>
            url.origin === self.location.origin &&
            (request.destination === 'script' ||
             request.destination === 'style' ||
             request.destination === 'manifest' ||
             url.pathname.endsWith('.json')),
        new StaleWhileRevalidate({
            cacheName: 'static-resources',
        })
    );

    // --- 6. Images ---
    registerRoute(
        ({ request }) => request.destination === 'image',
        new CacheFirst({
            cacheName: 'image-cache',
            plugins: [
                new ExpirationPlugin({
                    maxEntries: 100,
                    maxAgeSeconds: 60 * 60 * 24 * 30,
                    purgeOnQuotaError: true,
                }),
            ],
        })
    );

    // --- Offline Fallback ---
    // If a navigation request fails completely (offline and no cache),
    // try to return index.html from cache if available.
    setCatchHandler(async ({ event }) => {
        if (event.request.destination === 'document') {
            return caches.match('/index.html');
        }
        return Response.error();
    });

    // --- Precache App Shell ---
    self.addEventListener('install', (event) => {
        const urlsToPrecache = [
            '/',
            '/index.html',
            '/manifest.json',
            '/src/data/featuredAuthors.json',
            '/src/data/featuredJournals.json'
        ];
        event.waitUntil(
            caches.open('pages-cache').then((cache) => cache.addAll(urlsToPrecache))
        );
    });

} else {
    console.error('Workbox failed to load inside Service Worker.');
}
