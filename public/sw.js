
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

// Derive base from this worker's URL so root (dev) and /AI-Research-Orchestrator/ (GH Pages) stay aligned with register-sw.js.
// e.g. /sw.js → '' ; /AI-Research-Orchestrator/sw.js → '/AI-Research-Orchestrator'
const BASE_PATH = self.location.pathname.replace(/\/[^/]*$/, '').replace(/\/$/, '') || '';

// Exact-or-subdomain host match — a plain `.includes(domain)` also matches
// `evil-ncbi.nlm.nih.gov.attacker.example`, since the substring can appear anywhere in the URL.
function isHost(hostname, domain) {
    return hostname === domain || hostname.endsWith(`.${domain}`);
}

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
        ({ url }) => isHost(url.hostname, 'ncbi.nlm.nih.gov'),
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
            isHost(url.hostname, 'aistudiocdn.com') ||
            isHost(url.hostname, 'cdn.tailwindcss.com'),
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
            const cachedResponse =
                (await caches.match(`${BASE_PATH}/index.html`)) ||
                (await caches.match('/index.html'));
            if (cachedResponse) return cachedResponse;
        }
        return Response.error();
    });

    // --- Precache App Shell + icons (saved reports live in Dexie; shell must boot offline) ---
    self.addEventListener('install', (event) => {
        // Required: any failure rejects waitUntil → install fails (do not catch).
        const requiredUrls = [`${BASE_PATH}/`, `${BASE_PATH}/index.html`, `${BASE_PATH}/manifest.json`];
        // Optional: icons / register script may 404 in odd hosts; warn only.
        const optionalUrls = [
            `${BASE_PATH}/register-sw.js`,
            `${BASE_PATH}/icons/icon-192.png`,
            `${BASE_PATH}/icons/icon-512.png`,
        ];
        event.waitUntil(
            caches.open('pages-cache').then(async (cache) => {
                await Promise.all(requiredUrls.map((url) => cache.add(url)));
                await Promise.all(
                    optionalUrls.map((url) =>
                        cache.add(url).catch((err) => {
                            console.warn('Precache skipped (optional):', url, err);
                        }),
                    ),
                );
            }),
        );
    });

    // Warm hashed build assets (js/css under assets/ and chunks/) on first fetch via SWR above.
    // Dexie remains the offline source of truth for saved research reports (ADR 0004).

} else {
    console.error('Workbox failed to load inside Service Worker.');
}
