# ADR 0007: Heuristic Inference Layer (Offline / No-API-Key)

## Status

Accepted — 2026-07-17

## Context

All AI surfaces historically depended on a Gemini API key via `getAI()`, throwing `NO_API_KEY` when absent. Offline users could browse Dexie-backed Knowledge Base data but could not run research, TL;DR, author/journal analysis, or chat. Progressive enhancement requires a first-class local path.

## Decision

1. Introduce `InferenceMode = 'live' | 'heuristic'` resolved by `resolveInferenceMode` / `resolveActiveInferenceMode` from:
   - `settings.ai.forceHeuristicMode`
   - API key presence (`hasApiKey`)
   - `navigator.onLine`
2. Implement pure algorithms under `src/services/heuristics/` (query formulation, TF/Jaccard ranking, template synthesis, extractive TL;DR, author clustering, journal profiles, report-grounded chat, demo corpus).
3. Mode-aware façade in `geminiService.ts`: every exported AI function delegates to heuristics when mode is `heuristic`; never throw `NO_API_KEY` in that mode.
4. Seed educational demo KB entries on first empty launch (`demo-` id prefix); dismissible banner.
5. UI: `InferenceModeBadge`, Settings toggle, cost card shows `$0 · Heuristic mode`.

## Consequences

- Live Gemini remains the high-fidelity path when key + network are available.
- Heuristic outputs are deterministic, privacy-preserving, and clearly labeled.
- PubMed fetch is still attempted when online in heuristic mode; offline falls back to curated demo corpus.
- Bundle stays lean (no WASM / local LLM runtimes).
