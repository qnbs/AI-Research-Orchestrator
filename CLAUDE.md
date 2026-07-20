# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Research Orchestrator — a client-only React 19 PWA for agentic biomedical literature research. It couples PubMed (NCBI E-utilities) and arXiv retrieval with a pluggable AI provider layer (Gemini, OpenAI, Anthropic, local Ollama, or a deterministic heuristic fallback) to run: query formulation → live fetch → relevance ranking → streaming, cited synthesis. All user data (reports, history, settings, knowledge base, collections) lives in the browser via Dexie/IndexedDB — there is no backend. Live at `https://qnbs.github.io/AI-Research-Orchestrator/`.

**Canonical docs** — read before non-trivial changes: `AGENTS.md` (full agent guide with required-reading order), `docs/adr/0001`–`0008` (architecture decisions), `.cursor/rules/*.mdc` (numbered: `000` meta, `001` security, `010`/`011`/`012` content & PR-bot gates, `100`s APIs, `200`s architecture limits, `300`s UI, `800`s testing). `.github/copilot-instructions.md` predates the multi-provider/Recharts-only decisions — don't trust it over `AGENTS.md` or the ADRs.

## Commands

```bash
pnpm install --frozen-lockfile   # Node >=22, pnpm 11 — always frozen lockfile
pnpm run dev                     # Vite dev server, port 3000
pnpm run build                   # production build + CSP hash patch -> dist/
pnpm run typecheck               # tsc --noEmit (strict)
pnpm run lint                    # ESLint 9, warning budget --max-warnings 650
pnpm run format                  # Prettier write

pnpm run test                    # Vitest, watch mode
pnpm run test:run                # Vitest, run once
pnpm run test:coverage           # Vitest + v8 coverage (gated, see below)
pnpm exec vitest run src/services/pubmedUtils.test.ts   # single file
pnpm exec vitest run -t "retries on 429"                # single test by name

pnpm exec playwright install chromium   # one-time browser install
pnpm run test:e2e                       # Playwright, Chromium only
pnpm exec playwright test src/test/e2e/smoke.spec.ts -g "loads home"   # single e2e test

pnpm run bundle:budget   # gzip gate: chunk <=200kB, entry <=400kB, charts <=180kB
pnpm run analyze         # bundle visualizer -> dist/stats.html
```

Before touching orchestration/Knowledge-Base/provider code, run `typecheck`, `lint`, `test:coverage` — the same gates CI runs (`.github/workflows/deploy.yml`).

The coverage gate (`vitest.config.ts`) is scoped to logic layers only — `src/store`, `src/services`, `src/hooks`, `src/lib` — at 80% lines/statements, 55% branches/functions. UI views are covered by Playwright E2E instead, not unit coverage.

## Architecture

### Agentic pipeline & provider layer

The pipeline lives in `src/services/geminiService.ts` (`generateResearchReportStream`, an `AsyncGenerator`): query generation → PubMed/arXiv fetch → ranking → streaming synthesis. `App.tsx`'s `getAgentForPhase()` maps pipeline phases to conceptual agent roles (QueryGenerator, PubMedFetcher, ArxivFetcher, Ranker, Synthesizer) for the Agent Debugger UI — these are prompt/phase roles, not separate processes.

Actual transport is abstracted behind `src/services/providers/` (`gemini.ts`, `openai.ts`, `anthropic.ts`, `ollama.ts`, `heuristic.ts`), loaded lazily via `getProviderForSettings()` so unused vendor SDKs don't inflate the initial bundle. `geminiService.ts` is the stable feature façade and never talks to a vendor SDK directly — route new AI calls through the provider factory (ADR 0008).

### Inference mode — never a dead end

`InferenceMode` is `live | heuristic`, derived from API-key presence, `navigator.onLine`, and a Force-Heuristic toggle (`src/services/inferenceMode.ts`, `resolveActiveInferenceMode.ts`, hook `useInferenceMode`). Without a key or offline, the app must never throw `NO_API_KEY` into an empty UI: `src/services/heuristics/` (deterministic query formulation, lexical ranking, template synthesis, extractive TL;DR, author/journal tools, demo corpus) keeps every feature usable (ADR 0007). A new AI-backed feature needs a heuristic fallback path, not just a live-provider path.

### State management

Redux is the single source of truth (slices: `settings`, `ui`, `knowledgeBase`, `collections`, `theme`, `agentDebug`, plus RTK Query slices `apiSlice`/`geminiApiSlice`). React Context is hydration/composition-only: `SettingsProvider` hydrates IndexedDB → Redux once; `KnowledgeBaseContext`/`PresetContext` compose Dexie + Redux actions. Never duplicate the same flag in both Context and Redux (ADR 0001).

### Resilience & security

External calls use typed `AppError`/`toAppError` (`src/lib/errors.ts`), circuit breakers (`src/lib/circuitBreaker.ts` — never retry `AbortError`), and exponential backoff honoring `Retry-After` (`src/lib/resilience.ts`, `pubmedUtils.ts`). Every new external call path needs happy-path + failure + abort test coverage.

Provider API keys (Gemini `AIza…`, OpenAI `sk-…`, Anthropic `sk-ant-…`) and the optional NCBI key live only in AES-GCM-encrypted IndexedDB via `apiKeyService.ts` — never as env secrets (`.env.example` is documentation only; `VITE_*` vars are client-visible). See `SECURITY.md` and ADR 0003.

### PWA & CSP

Service worker at `public/sw.js`; `404.html` handles SPA routing on GitHub Pages. `index.html` carries a CSP meta tag (hashes for inline JSON-LD/importmap) plus an import map loading React et al. from `aistudiocdn.com`. `pnpm run build` re-hashes the CSP via `scripts/patch-csp-hashes.mjs` — this must keep working whenever a new inline script is added.

## Conventions

- **English-only repository content** (since 2026-07-16): all new docs, comments, commit messages, and default/fallback strings are English. Existing German locale _values_ in `src/i18n/translations.ts` stay as-is; new UI strings need both EN and DE keys, rendered via `t()`.
- File size target 200–400 lines, hard max 700. Split large views into `FeatureView.tsx` + `FeatureViewContext.tsx` + `useFeatureLogic.ts` (see the Authors/Journals/Knowledge-Base views for the pattern).
- New persistent data requires an explicit Dexie schema version bump + migration in `databaseService.ts`, plus a `CHANGELOG.md` entry if breaking.
- All HTML/Markdown is sanitized with DOMPurify; no bare `dangerouslySetInnerHTML`; prompt fragments go through `lib/promptSanitize.ts`; CSV export must stay formula-injection-safe.
- New feature checklist: Redux slice/RTK Query endpoint → Dexie schema (if persisted) → i18n EN+DE → Framer Motion transition → ARIA/keyboard support → unit test stub.
- Chart library is Recharts only (ADR 0005) — do not reintroduce Chart.js.
- Resolve _all_ automated review-bot comments (CodeRabbit, CodeAnt, etc.) on a PR, including nitpicks and out-of-diff items, before considering it mergeable.

## Code intelligence (local, not committed)

This repo has both `codegraph` (`.codegraph/` — fast deterministic symbol/call-graph index; `codegraph query|explore|node|callers|callees|impact`) and `graphify` (`graphify-out/` — code+docs knowledge graph with community clusters, `GRAPH_REPORT.md`, `graph.html`, `wiki/`) set up. Both are **fully gitignored here** — this project is solo-dev, so the general "commit `graphify-out/*` for the team" policy in the ancestor `~/CLAUDE.md` (Omni-Archive team policy) does not apply to this repo; everything regenerates locally (`codegraph init .`, `/graphify .`). A `.husky/post-commit` hook keeps both in sync after every commit via free/deterministic updates only (`codegraph sync -q`, `graphify update .`) — no LLM calls, so it never costs tokens or blocks a commit.

## Testing notes

- Unit/integration specs are colocated `*.test.ts(x)` next to their source. `src/test/setup.ts` mocks IndexedDB and Web Crypto; `fake-indexeddb` is available for DB-heavy tests. Keep specs deterministic (mock network/AI/crypto calls) and isolated (no shared mutable state across files) — never comment out or delete a failing test to get CI green.
- E2E specs live in `src/test/e2e/` (`agent-flow.spec.ts`, `smoke.spec.ts`); Playwright auto-starts the Vite dev server and uses a fake Gemini key. Prefer `getByRole` selectors; justify any `sleep`.
