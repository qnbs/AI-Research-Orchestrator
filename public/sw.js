// Derive base from this worker's URL so root (dev) and /AI-Research-Orchestrator/ (GH Pages) stay aligned with register-sw.js.
// e.g. /sw.js → '' ; /AI-Research-Orchestrator/sw.js → '/AI-Research-Orchestrator'
const BASE_PATH = self.location.pathname.replace(/\/[^/]*$/, '').replace(/\/$/, '') || '';

// Self-hosted Workbox (ADR 0004/WS-B): no CDN dependency at runtime. Files
// copied from the workbox-* npm packages via scripts/copy-workbox.mjs
// (pnpm run workbox:copy) - re-run that script and bump WORKBOX_VERSION
// together when upgrading.
const WORKBOX_VERSION = '7.0.0';
importScripts(`${BASE_PATH}/workbox-v${WORKBOX_VERSION}/workbox-sw.js`);
workbox.setConfig({
  debug: false,
  modulePathPrefix: `${BASE_PATH}/workbox-v${WORKBOX_VERSION}`,
});

// Bump on any change to what gets cached or how - activate-time cleanup
// below removes every runtime cache from a previous version.
const CACHE_VERSION = 'v1';
const CACHE_NAMES = {
  pages: `pages-cache-${CACHE_VERSION}`,
  pubmedApi: `pubmed-api-cache-${CACHE_VERSION}`,
  googleFontsStylesheets: `google-fonts-stylesheets-${CACHE_VERSION}`,
  googleFontsWebfonts: `google-fonts-webfonts-${CACHE_VERSION}`,
  staticResources: `static-resources-${CACHE_VERSION}`,
  images: `image-cache-${CACHE_VERSION}`,
};
// Base names (without version) - used to recognize a previous version of one
// of our own runtime caches without also touching Workbox's own precache
// (versioned separately by workbox.precaching.cleanupOutdatedCaches()).
const CACHE_BASE_NAMES = Object.keys(CACHE_NAMES).map((key) => CACHE_NAMES[key].replace(/-v[^-]*$/, ''));

// Exact-or-subdomain host match — a plain `.includes(domain)` also matches
// `evil-ncbi.nlm.nih.gov.attacker.example`, since the substring can appear anywhere in the URL.
function isHost(hostname, domain) {
    return hostname === domain || hostname.endsWith(`.${domain}`);
}

// Matches this SW's own cache names exactly - `<base>` (pre-versioning) or
// `<base>-v<digits>` (any past/future CACHE_VERSION) - never a same-prefixed
// but unrelated cache. A plain `startsWith(`${base}-v`)` also matches
// `pages-cache-victim` (base "pages-cache" + "-v" + "ictim"), which isn't
// one of ours at all.
function isOwnedCacheName(key, base) {
    const escapedBase = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return key === base || new RegExp(`^${escapedBase}-v[0-9]+$`).test(key);
}

if (workbox) {
    // Take control of already-open clients once activated, but activation
    // itself waits for an explicit message from the page (see the `message`
    // listener below) rather than skipping the waiting phase unconditionally -
    // an unconditional skipWaiting() silently hot-swaps the SW under an
    // already-open tab, which can serve a new SW's fetch handlers against a
    // page still running the old JS bundle in memory.
    workbox.core.clientsClaim();

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
            cacheName: CACHE_NAMES.pages,
            plugins: [
                new CacheableResponsePlugin({ statuses: [200] }),
            ],
        })
    );

    // --- 2. Critical Data (PubMed API) ---
    // Strategy: Network First (Fresh Data Priority)
    // Optimization: Short timeout (5s) to prevent hanging on slow connections.
    registerRoute(
        ({ url }) => isHost(url.hostname, 'ncbi.nlm.nih.gov'),
        new NetworkFirst({
            cacheName: CACHE_NAMES.pubmedApi,
            networkTimeoutSeconds: 5,
            plugins: [
                new CacheableResponsePlugin({ statuses: [200] }),
                new ExpirationPlugin({
                    maxEntries: 200,
                    maxAgeSeconds: 60 * 60 * 24 * 7, // 1 week
                    purgeOnQuotaError: true,
                }),
            ],
        })
    );

    // --- 3. Google Fonts ---
    // Stylesheets: StaleWhileRevalidate
    registerRoute(
        ({ url }) => url.origin === 'https://fonts.googleapis.com',
        new StaleWhileRevalidate({
            cacheName: CACHE_NAMES.googleFontsStylesheets,
        })
    );

    // Webfonts: CacheFirst (Immutable)
    // statuses stays [0, 200] here (unlike the other routes above): Workbox's
    // own Google Fonts recipe pairs [0, 200] specifically with this route,
    // since @font-face resource fetches can legitimately come back opaque
    // (status 0) in some browsers even on success - unlike fetch()-driven
    // navigation/API calls, where opaque only ever masks a real failure.
    registerRoute(
        ({ url }) => url.origin === 'https://fonts.gstatic.com',
        new CacheFirst({
            cacheName: CACHE_NAMES.googleFontsWebfonts,
            plugins: [
                new CacheableResponsePlugin({ statuses: [0, 200] }),
                new ExpirationPlugin({
                    maxAgeSeconds: 60 * 60 * 24 * 365,
                    maxEntries: 30,
                }),
            ],
        })
    );

    // --- 4. Local Static Assets ---
    registerRoute(
        ({ request, url }) =>
            url.origin === self.location.origin &&
            (request.destination === 'script' ||
             request.destination === 'style' ||
             request.destination === 'manifest' ||
             url.pathname.endsWith('.json')),
        new StaleWhileRevalidate({
            cacheName: CACHE_NAMES.staticResources,
        })
    );

    // --- 5. Images ---
    registerRoute(
        ({ request }) => request.destination === 'image',
        new CacheFirst({
            cacheName: CACHE_NAMES.images,
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
            caches.open(CACHE_NAMES.pages).then(async (cache) => {
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

    // --- Prune stale versions of our own runtime caches on activate ---
    // Covers both a previously-versioned name (`<base>-v<n>`, from a future
    // version bump) AND the bare pre-versioning name (`<base>` exactly, e.g.
    // `pages-cache` from before CACHE_VERSION existed at all) - anyone with
    // this PWA already installed still has those six unversioned caches
    // sitting around, and they'd otherwise survive every activate forever.
    self.addEventListener('activate', (event) => {
        const currentNames = new Set(Object.values(CACHE_NAMES));
        event.waitUntil(
            caches.keys().then((keys) =>
                Promise.all(
                    keys
                        .filter(
                            (key) =>
                                CACHE_BASE_NAMES.some((base) => isOwnedCacheName(key, base)) &&
                                !currentNames.has(key),
                        )
                        .map((key) => caches.delete(key)),
                ),
            ),
        );
    });

    // --- Update flow: wait for the page to explicitly ask before activating ---
    // register-sw.js shows an "update available" banner (UpdateAvailableBanner)
    // once a new worker reaches the `installed` state with an existing
    // controller present; its "Reload" button postMessages this, and the page
    // reloads once on the resulting `controllerchange`.
    self.addEventListener('message', (event) => {
        // A service worker can only ever be controlled by same-origin clients
        // (registration itself requires a same-origin scope), so this is
        // defense-in-depth rather than a reachable cross-origin path - but it's
        // what CodeQL's js/missing-origin-check rule expects regardless.
        if (event.origin !== self.location.origin) return;
        if (event.data && event.data.type === 'SKIP_WAITING') {
            self.skipWaiting();
        }
    });

    // Warm hashed build assets (js/css under assets/ and chunks/) on first fetch via SWR above.
    // Dexie remains the offline source of truth for saved research reports (ADR 0004).

} else {
    console.error('Workbox failed to load inside Service Worker.');
}
