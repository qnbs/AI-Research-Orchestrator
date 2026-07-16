# ADR 0002: Agent Orchestration Pattern

- **Status:** Accepted
- **Date:** 2026-07-16

## Context

Research runs must stream progress to the UI, support cancel, stay PMID-grounded, and remain testable without a backend.

## Decision

Use a **phased AsyncGenerator** in `src/services/geminiService.ts` (`generateResearchReportStream`):

1. Query generation (Gemini Flash)
2. PubMed search + detail fetch
3. Optional arXiv enrichment
4. Semantic ranking (Gemini)
5. Streaming synthesis (Gemini Pro / configured model)

UI maps phases to conceptual agents (`QueryGenerator`, `PubMedFetcher`, `Ranker`, `Synthesizer`) in `App.tsx` — **prompt/phase roles**, not separate SDK processes.

Cancellation via `AbortSignal`; aborts surface as `AppError` with code `STREAM_ABORTED`. External PubMed calls use circuit breaker + backoff (`circuitBreaker`, `pubmedUtils`).

## Consequences

- Easy to unit-test phases with mocked Gemini/PubMed.
- Evolution path: structured outputs, eval harness, multi-LLM adapter (Phase 2+) without rewriting UI contracts.
- Avoid introducing a heavy agent framework until adapter boundaries exist.

## Alternatives Considered

- Full LangGraph-style runtime: deferred to v2.0 vision.
- RTK Query-only orchestration: `geminiApiSlice` exists for cache/abort patterns but primary UX path remains the AsyncGenerator in App.
