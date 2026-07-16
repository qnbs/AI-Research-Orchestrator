# ADR 0004: PWA Offline Strategy

- **Status:** Accepted
- **Date:** 2026-07-16

## Context

Researchers need access to past reports and collections offline. Live PubMed/Gemini data cannot be fully cached as truth.

## Decision

- **Service worker** (`sw.js` / Workbox via Vite PWA path): app shell + static assets with stale-while-revalidate where safe.
- **Domain data:** Dexie/IndexedDB is the offline source of truth for KB, settings, collections, saved reports.
- **Live search / synthesis:** network-first; never treat SW-cached PubMed HTML/JSON as authoritative for new research.
- **Partial failure:** prefer saving intermediate orchestrator state to Dexie (Phase 0 backlog → implement resume UX next).

## Consequences

- Offline: browse saved knowledge; online: run new research.
- SW updates must not wipe IndexedDB.
- Future: richer offline banners, background sync ideas (Phase 3).

## Alternatives Considered

- Aggressive SW caching of all API responses: rejected (stale science risk).
- Full offline LLM: out of scope for v0.x.
