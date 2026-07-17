# ADR 0004: PWA Offline Strategy

- **Status:** Accepted
- **Date:** 2026-07-16

## Context

Researchers need access to past reports and collections offline. Live PubMed/Gemini data cannot be fully cached as truth.

## Decision

- **Service worker** (`public/sw.js` / Workbox CDN, copied into `dist/` by Vite): app shell + static assets with stale-while-revalidate where safe. Base path is derived from the worker URL (root in dev, `/AI-Research-Orchestrator` on GitHub Pages) so registration scope and precache URLs stay aligned. Precache **requires** `index.html` + manifest (install fails if missing); icons/register script are optional. Lazy route chunks are cached on first online visit.
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
