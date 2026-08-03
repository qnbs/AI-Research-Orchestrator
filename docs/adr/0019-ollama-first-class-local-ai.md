# ADR 0019: Ollama First-Class Local AI

**Status:** Accepted — 2026-08-03

## Context

Ollama was wired as a thin fetch adapter (`/api/generate`, `/api/chat`). Health checks only pinged `/api/tags`, the NDJSON reader silently dropped malformed lines without bounds, and CSP/`endpointPolicy` allowed loopback validation for `127.0.0.1` / `[::1]` while `connect-src` only listed `http://localhost:11434`. Settings had no Local AI diagnostics, and “Local AI” could be mistaken for fully offline research.

## Decision

1. Treat Ollama as a first-class Local AI subsystem with explicit health (`/api/version`) and model discovery (`/api/tags`), TTL-cached for Settings UX.
2. Use a bounded NDJSON parser (`streamOllamaNdjson`) with max buffer, malformed-record threshold, abort respect, and reader cleanup.
3. Align CSP `connect-src` with `CSP_ALLOWED_ORIGINS` for `localhost`, `127.0.0.1`, and `[::1]` on port 11434.
4. Surface health, discovered models, model-missing / small-model warnings, and a privacy note that PubMed/arXiv retrieval still uses the network.
5. Derive Ollama prompt-input budgets from model size hints; keep heuristic as a separate backend (ADR 0009), never as silent Ollama fallback.

## Consequences

- Users can diagnose CORS, timeout, unavailable, and model-list failures before starting a run.
- Remote LAN Ollama still requires a tailored CSP / self-host build (ADR 0013); this ADR only first-classes loopback Local AI.
- Provider conformance tests cover NDJSON edge cases and health probes.

## References

- `src/services/providers/ollama.ts`
- `src/services/providers/ollamaHealth.ts`
- `src/lib/ollamaNdjson.ts`
- `src/components/settings/OllamaHealthPanel.tsx`
- ADR 0013 (endpoint trust), ADR 0008 (multi-provider)
