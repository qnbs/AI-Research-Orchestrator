# ADR 0011: Remove the CDN Import Map

## Status

Accepted (2026-07-22)

## Context

`index.html` shipped a browser-native `<script type="importmap">` mapping ~13 bare
specifiers (`react`, `react-dom/client`, `@google/genai`, `dexie`, `marked`,
`dompurify`, `jspdf`, `vitest`, ...) to `https://aistudiocdn.com/...` — a leftover
from this app's origin as an AI-Studio-scaffolded, no-build prototype. The CSP's
`script-src`/`connect-src` trusted that host, and `preconnect`ed to it.

Verified empirically before removal: `vite.config.ts` already bundles every one of
those packages normally from `node_modules` (`manualChunks` assigns `react`/
`react-dom` to `vendor-react`, `react-redux`/`@reduxjs/toolkit` to `vendor-redux`,
etc.; `optimizeDeps.include` pre-bundles them for dev). A production build followed
by grepping `dist/js/` and `dist/chunks/` for `aistudiocdn` found zero references —
no bare specifier ever reaches the browser unresolved, so the import map was never
actually consulted at runtime. It was pure attack surface: a live host trusted by
the CSP, a `preconnect`, and network egress capability with no functional purpose.

`public/sw.js` additionally cached `aistudiocdn.com` and `cdn.tailwindcss.com`
responses via a dedicated Workbox route ("3. CDN Libraries"). Tailwind is a
build-time devDependency here (`tailwindcss`, `@tailwindcss/postcss`), never
CDN-loaded — that route was dead code for both hosts it checked, not just one.

## Decision

Remove the import map, its `preconnect`, and `aistudiocdn.com` from the CSP
entirely. Remove the now-fully-dead "CDN Libraries" service-worker route (both
hosts). Reduce `scripts/patch-csp-hashes.mjs` to hash only the inline JSON-LD
script (the only inline script left), and make it fail loudly — not silently
skip — if it ever finds an unrecognized inline `<script>` in the built HTML.

Add `scripts/check-no-cdn-scripts.mjs` as a permanent CI gate (`deploy.yml`'s
build job): fails if `dist/index.html` ever references a host outside an explicit
allowlist (`fonts.googleapis.com`, `fonts.gstatic.com` — the two hosts genuinely
still needed, for webfonts) in a `<script src>` or a fetch-triggering `<link>`
(`stylesheet`/`preconnect`/`preload`/`icon`/`manifest`/...; `rel="canonical"` and
similar purely-referential rels are intentionally excluded, since they point at
this app's own production URL and are never fetched by the browser), or if an
`<script type="importmap">` ever reappears.

## Consequences

- Every JS dependency is bundled by Vite; the app has zero runtime dependency on
  `aistudiocdn.com` or any other JS CDN.
- CSP `script-src`/`connect-src` no longer trust `aistudiocdn.com` — one fewer
  origin that could serve malicious code if ever compromised or typosquatted.
- `scripts/check-no-cdn-scripts.mjs` makes this a regression-guarded decision, not
  just a one-time cleanup: reintroducing a CDN script or an import map fails CI.
- `public/sw.js`'s remaining route numbering shifted (`3. Google Fonts` through
  `5. Images`) after removing the dead CDN-libraries route; no functional change.
- Google Fonts stylesheets/webfonts remain the one legitimate external CDN
  dependency (`fonts.googleapis.com`/`fonts.gstatic.com`), explicitly allowlisted
  rather than removed — self-hosting fonts is a separate, unrelated decision, not
  in scope here.
