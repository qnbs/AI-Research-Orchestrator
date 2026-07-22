# ADR 0009: Consolidated Non-AI Programmatic Research Engine

## Status

Accepted — 2026-07-22

> Ratified after discovery (three parallel research passes plus a dedicated
> design pass) confirmed Option A but found the literal "fold
> engine-equivalent modules in, delete duplicates" reading of the Decision
> below would have caused real regressions (a live keyword-stemming bug
> surfacing as user-visible output, a silently-lost curated journal
> knowledge base, lost MeSH query-expansion terms, a lost offline fallback,
> a lost streaming-synthesis UX) or an outright compile break (no nonAi
> equivalent existed for the report chat-session factory). The two Context
> corrections below were identified during that same discovery pass; the
> actual file-level survivor decisions live in the implementation commit,
> not restated here.

## Context

The codebase carried **three overlapping deterministic (non-AI) code paths** with substantial duplicated intent:

1. The **`heuristic` provider** (`src/services/providers/heuristic.ts`, ADR-0007) — the registry entry that exposes deterministic inference behind the `AIProvider` interface. Registered, selectable in Settings, and unit-tested — but its actual `generateContent`/`generateContentStream`/`createChatSession` methods are unreachable in the live app: `geminiService.ts`'s `shouldUseHeuristic()` early-exits to call deterministic functions directly at every real call site whenever heuristic mode is active, before the provider registry is ever consulted. This consolidation does not change that; see Consequences.
2. **`src/services/heuristics/**`** — the older, thinner deterministic layer (`queryFormulation`, `ranking`, `keywords`, `journalProfiling`+`journalData`, `synthesis`+`summarization`, `chat`, `authorDisambiguation`, `similarArticles`, `researchStream`, `sampleData`). Wired (used by the provider and by `geminiService`fallbacks) and reasonably covered. **Correction**: contrary to an earlier draft of this ADR, this layer does have a real literature retriever —`researchStream.ts` calls the same PubMed/arXiv transport (`searchPubMedForIds`, `fetchArticleDetails`, `searchAndFetchArxiv`) that `nonAi/retriever.ts` wraps in a circuit breaker, falling back to a curated demo corpus only when offline or when the live search returns nothing (this is the intentional design documented in ADR-0007). So a no-API-key user could already complete a real literature-review run before this consolidation — the actual problem this ADR fixes is **duplication and dead code**, not an unreachable feature.
3. **`src/services/nonAi/**`** (~2,331 LOC) — a newer, **more complete** deterministic pipeline (`queryBuilder`, `retriever`for PubMed/arXiv,`ranker`, `curator`, `keywordExtractor`, `authorClusterer`, `journalProfiler`, `synthesizer`, `chatResponder`, `similarFinder`, plus `meshDictionary`and`stopwords`). Introduced as a foundation module, it was **dead code**: zero external imports, tree-shaken out of the bundle, and dragging the coverage denominator (`retriever.ts`4.72%,`keywordExtractor.ts`9.75%,`index.ts` 26.38%).

The capability overlap between (2) and (3) was near one-to-one: query building, ranking, keyword extraction, journal profiling, synthesis, chat, similar-article finding, and author handling each existed in **both** layers under different names. Maintaining two deterministic pipelines was wasteful, and shipping the richer one as dead code was worse.

The product is pre-1.0 with **no existing users**, so consolidation carried no migration or backward-compatibility cost — redundant code was deleted outright once every unique capability it held was confirmed folded in.

## Options considered

- **(A) Consolidate to a single engine — chosen.** Make `nonAi/` the canonical deterministic engine (it is the superset), fold in whatever unique behaviour `heuristics/` still provides, delete the duplicates, and have the `heuristic` provider delegate to the consolidated engine. One pipeline to maintain; dead code eliminated; the richer retrieval path becomes real.
- **(B) Surface `nonAi/` behind the registry without full consolidation.** Faster, but leaves two deterministic pipelines alive and the duplication unresolved — rejected as it entrenches the current smell.
- **(C) Model the engine as an orthogonal "engine mode" outside the provider registry.** Only justified if the `AIProvider` interface genuinely cannot represent "does its own retrieval." Deferred unless discovery proves the interface insufficient.

## Decision

1. **`src/services/nonAi/**`is the single canonical deterministic engine.** Its pipeline is the supported path:`queryBuilder → retriever (PubMed/arXiv) → ranker → curator → {keywordExtractor, authorClusterer, journalProfiler} → {synthesizer, chatResponder, similarFinder}`, backed by `meshDictionary`, `stopwords`, and `sampleData` (curated demo corpus / offline fallback).
2. **`src/services/heuristics/**`was de-duplicated against the engine, then deleted in full.** This was an *enriched* consolidation, not a literal "delete the duplicates" pass: every piece`heuristics/`did better, or had that`nonAi/`lacked entirely, was ported in first — a curated journal knowledge base (ISSN/OA-policy/impact-factor/publisher data`nonAi/journalProfiler.ts` didn't have), 13 missing curated MeSH query-expansion terms, the offline/empty-result demo-corpus fallback, incremental synthesis-chunk streaming, a single-abstract TL;DR function, the report chat-session factory (`nonAi`had no equivalent at all — this one was a hard compile-time dependency, not just a quality gap), and a more precise bigram-based author-title fingerprint. Two real, independent bugs were also fixed as part of this merge:`nonAi/keywordExtractor.ts`was returning *stemmed* keywords ("hyperten", "diabet") as user-facing chips instead of real words, and`nonAi/curator.ts`'s `enrichArticles()`never classified`articleType`for real (non-demo) articles, silently disabling`ranker.ts`'s own publication-type quality boost.
3. **The engine is surfaced as a first-class, no-API-key path.** A Settings-UI info line (gated on `isNonAiAvailable()`) confirms the engine is active when the Heuristic provider is selected. The `heuristic` provider adapter (`providers/heuristic.ts`) now delegates its `generateContentStream`/`createChatSession` methods to the consolidated engine — but per the Context correction above, `geminiService.ts`'s direct `shouldUseHeuristic()` branches remain the actual, reachable code path for real usage; making the adapter "thin" does not change that, since the `AIProvider` interface's prompt-in/text-out shape cannot represent this engine's multi-phase retrieve→rank→curate→synthesize pipeline (confirmed during discovery — this validates Option C's premise for that one capability, without requiring the full orthogonal-mode restructure).
4. **Coverage-first.** Every surviving engine file has a dedicated test file (replacing one 442-line aggregate); the three previously zero-coverage files (`retriever.ts`, `keywordExtractor.ts`, `index.ts`) and three previously _untested_ files (`utils.ts`, `ranker.ts`, `sampleData.ts`) all gained real coverage. Network is mocked at the transport boundary (`pubmedUtils`/`arxivUtils`/`apiKeyService`).
5. **No migration, no shims.** Duplicates were deleted outright; no delegation stubs were kept "just in case."
6. **Full wiring.** The engine is imported by the provider registry (`providers/heuristic.ts`), Settings (`SettingsSubComponents.tsx`), orchestration (`researchOrchestratorAdapter.ts` → `geminiService.ts`), and the Knowledge Base / Journals / Authors views (via the shared `RankedArticle`/`ResearchReport`/`AuthorCluster`/`JournalProfile` shapes it already produces).
7. **German-language tokenization/stemming stays dormant.** Both layers shipped German stopword data, but every real `nonAi/` call site hardcodes English tokenization and neither test suite had a German test case. This consolidation does not newly lose German support (it was already unused in practice) and does not invest in building it out — an explicit scope decision, not an oversight.

## Consequences

- Exactly **one** deterministic pipeline is maintained; `src/services/heuristics/**` no longer exists.
- Dead code is removed from `main`; the coverage denominator no longer contains unreachable, low-coverage modules — `services/nonAi` now measures 97.5% lines / 84.9% branches / 92.9% functions in aggregate.
- A user with **no API key** can complete a real literature-review run (query → retrieve → rank → curate → synthesise) from the UI, now through one maintained pipeline instead of two.
- The `heuristic` provider (ADR-0007) delegates to the consolidated engine for the capabilities it's actually reachable for; its research-report path remains routed around the provider interface via `researchOrchestratorAdapter.ts`, unchanged in shape from before.
- Complements ADR-0008: the registry's deterministic entry now backs onto a single, better-tested engine rather than a thinner, duplicate layer.
- Real churn in `geminiService.ts`'s heuristic-fallback imports (repointed from `./heuristics` to `./nonAi`, with two additional consumers found during the sweep that weren't in the original known list: `DemoDataBanner.tsx` and `lib/heuristicEval.ts`) and in every test file that referenced the deleted `heuristics/` modules.
- The engine's own network calls (PubMed/arXiv) run under the existing CSP `connect-src`; both hosts were already permitted, confirmed live by `heuristics/researchStream.ts` before this consolidation.

## Deferred work

- Broadening retrieval sources beyond PubMed/arXiv.
- The end-to-end no-key path is validated in `src/test/e2e/provider-flow.spec.ts` alongside the other providers (not yet written — tracked in PROMPT-ARO-01 WS-3).
- Any ranking/curation-quality tuning beyond parity with the previous heuristic output.
- Building out real German-language support (currently dormant data only, per Decision §7) if ever prioritized.
