# ADR 0004: PWA Offline Strategy

- **Status:** Accepted
- **Date:** 2026-07-16
- **Amended:** 2026-07-23 (self-hosted Workbox, versioned caches, explicit update flow — WS-B)

## Context

Researchers need access to past reports and collections offline. Live PubMed/Gemini data cannot be fully cached as truth.

## Decision

- **Service worker** (`public/sw.js`, self-hosted Workbox — `scripts/copy-workbox.mjs` copies the built module files from the `workbox-*` npm packages into `public/workbox-v<version>/`, no CDN dependency at runtime): app shell + static assets with stale-while-revalidate where safe. Base path is derived from the worker URL (root in dev, `/AI-Research-Orchestrator` on GitHub Pages) so registration scope, precache URLs, and the self-hosted Workbox path all stay aligned. Precache **requires** `index.html` + manifest (install fails if missing); icons/register script are optional. Lazy route chunks are cached on first online visit. Every runtime cache name carries a `CACHE_VERSION` suffix, pruned on `activate` — bump the version alongside any change to what gets cached or how.
- **Update flow:** the SW no longer calls `skipWaiting()` unconditionally on install — an unconditional skip hot-swaps the SW under an already-open tab, which can serve a new SW's fetch handlers against a page still running the old JS bundle in memory. Instead, `register-sw.js` detects a waiting worker and dispatches a window event; `UpdateAvailableBanner` (via `useServiceWorkerUpdate`) shows an i18n'd "reload" prompt, and only posts `SKIP_WAITING` to the SW once the user acts on it — the page then reloads once on the resulting `controllerchange`.
- **Domain data:** Dexie/IndexedDB is the offline source of truth for KB, settings, collections, saved reports — **not** mirrored into the Cache API.
- **Live search / synthesis:** network-first; never treat SW-cached PubMed HTML/JSON as authoritative for new research.
- **UX:** `OfflineBanner` signals that live Gemini/PubMed calls will fail while Dexie-backed saved reports remain readable.
- **Partial failure:** abort/error checkpoints persist to Dexie (`researchCheckpoints`); soft resume UX restores a checkpoint into the UI.

## Consequences

- Offline: browse saved knowledge; online: run new research.
- SW updates must not wipe IndexedDB.
- Future: background sync ideas remain Phase 3 / P3.

## Alternatives Considered

- Aggressive SW caching of all API responses: rejected (stale science risk).
- Full offline LLM: out of scope for v0.x.
