# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Research Orchestrator — a client-only React 19 PWA for agentic biomedical literature research. It couples PubMed (NCBI E-utilities) and arXiv retrieval with a pluggable AI provider layer (Gemini, OpenAI, Anthropic, local Ollama, or a deterministic heuristic fallback) to run: query formulation → live fetch → relevance ranking → streaming, cited synthesis. All user data (reports, history, settings, knowledge base, collections) lives in the browser via Dexie/IndexedDB — there is no backend. Live at `https://qnbs.github.io/AI-Research-Orchestrator/`.

**Canonical docs** — read before non-trivial changes: `AGENTS.md` (full agent guide with required-reading order), `docs/adr/0001`–`0021` (architecture decisions — see `docs/adr/README.md`), `docs/ci-branch-governance.md` + `docs/pr-merge-gate.md` + `docs/project-facts.json` (CI/ruleset / dual merge gate), `.cursor/rules/*.mdc` (numbered: `000` meta, `001` security, `010`/`011`/`012`/`013` content & PR-bot gates, `100`s APIs, `200`s architecture limits, `300`s UI, `800`s testing). Prefer `AGENTS.md` if anything conflicts with older notes. Merge policy: `docs/pr-merge-gate.md`.

## Commands

```bash
pnpm install --frozen-lockfile   # Node >=22, pnpm 11 — always frozen lockfile
pnpm run dev                     # Vite dev server, port 3000
pnpm run build                   # production build + CSP hash patch -> dist/
pnpm run typecheck               # tsc --noEmit (strict)
pnpm run lint                    # ESLint 9, zero-warning gate (--max-warnings 0)
pnpm run format                  # Prettier write

pnpm run test                    # Vitest, watch mode
pnpm run test:run                # Vitest, run once
pnpm run test:coverage           # Vitest + v8 coverage (gated, see below)
pnpm exec vitest run src/services/pubmedUtils.test.ts   # single file
pnpm exec vitest run -t "retries on 429"                # single test by name
# Prefer scoped `pnpm exec vitest run <file>` locally; read the full test:coverage gate
# result from CI's "Typecheck, Lint & Tests" job rather than re-running it
# locally every time - see Testing notes below.

pnpm exec playwright install chromium   # one-time browser install
pnpm exec playwright test src/test/e2e/smoke.spec.ts -g "loads home"   # single e2e test
pnpm exec playwright test src/test/e2e/agent-flow.spec.ts              # one spec file
# Do NOT run `pnpm run test:e2e` (full seven-spec suite) locally on constrained hardware —
# see Testing notes. Read Chromium + cross-browser job logs from GitHub Actions instead.

pnpm run bundle:budget   # gzip gate: chunk <=200kB, entry <=400kB, charts <=180kB
pnpm run analyze         # bundle visualizer -> dist/stats.html
```

Before touching orchestration/Knowledge-Base/provider code, run `typecheck` and `lint` locally (fast), and scope `pnpm exec vitest run` to the file(s) you touched — then push and read the full `test:coverage` gate result from CI's "Typecheck, Lint & Tests" job (`.github/workflows/deploy.yml`) rather than reproducing the whole suite locally every time; see Testing notes.

The coverage gate (`vitest.config.ts`) is scoped to logic layers only — `src/store`, `src/services`, `src/hooks`, `src/lib` — at 80% lines/statements, 55% branches/functions. UI views are covered by Playwright E2E instead, not unit coverage.

## Architecture

### Agentic pipeline & provider layer

The pipeline lives in `src/services/geminiService.ts` (`generateResearchReportStream`, an `AsyncGenerator`): query generation → PubMed/arXiv fetch → ranking → streaming synthesis. `App.tsx`'s `getAgentForPhase()` maps pipeline phases to conceptual agent roles (QueryGenerator, PubMedFetcher, ArxivFetcher, Ranker, Synthesizer) for the Agent Debugger UI — these are prompt/phase roles, not separate processes.

Actual transport is abstracted behind `src/services/providers/` (`gemini.ts`, `openai.ts`, `anthropic.ts`, `ollama.ts`, `heuristic.ts`), loaded lazily via `getProviderForSettings()` so unused vendor SDKs don't inflate the initial bundle. `geminiService.ts` is the stable feature façade and never talks to a vendor SDK directly — route new AI calls through the provider factory (ADR 0008).

### Inference mode — never a dead end

`InferenceMode` is `live | heuristic`, derived from API-key presence, `navigator.onLine`, and a Force-Heuristic toggle (`src/services/inferenceMode.ts`, `resolveActiveInferenceMode.ts`, hook `useInferenceMode`). Without a key or offline, the app must never throw `NO_API_KEY` into an empty UI: `src/services/nonAi/` (deterministic query formulation, lexical ranking, template synthesis, extractive TL;DR, author/journal tools, demo corpus) keeps every feature usable (ADR 0007, consolidated in ADR 0009). A new AI-backed feature needs a heuristic fallback path, not just a live-provider path.

### State management

Redux is the single source of truth (slices: `settings`, `ui`, `knowledgeBase`, `collections`, `theme`, `agentDebug`, plus RTK Query slices `apiSlice`/`geminiApiSlice`). React Context is hydration/composition-only: `SettingsProvider` hydrates IndexedDB → Redux once; `KnowledgeBaseContext`/`PresetContext` compose Dexie + Redux actions. Never duplicate the same flag in both Context and Redux (ADR 0001).

### Resilience & security

External calls use typed `AppError`/`toAppError` (`src/lib/errors.ts`), circuit breakers (`src/lib/circuitBreaker.ts` — never retry `AbortError`), and exponential backoff honoring `Retry-After` (`src/lib/resilience.ts`, `pubmedUtils.ts`). Every new external call path needs happy-path + failure + abort test coverage.

Provider API keys (Gemini `AIza…`, OpenAI `sk-…`, Anthropic `sk-ant-…`) and the optional NCBI key live only in AES-GCM-encrypted IndexedDB via `apiKeyService.ts` — never as env secrets (`.env.example` is documentation only; `VITE_*` vars are client-visible). See `SECURITY.md` and ADR 0003.

### PWA & CSP

Service worker at `public/sw.js`; `404.html` handles SPA routing on GitHub Pages. `index.html` carries a CSP meta tag (a hash for the inline JSON-LD block only — no CDN import map, removed in ADR 0011; every JS dependency is bundled by Vite). `pnpm run build` re-hashes the CSP via `scripts/patch-csp-hashes.mjs` — this must keep working whenever a new inline script is added; `pnpm run check:no-cdn-scripts` (wired into CI) fails loudly if a CDN `<script>` or import map ever reappears.

## Conventions

- **English-only repository content** (since 2026-07-16): all new docs, comments, commit messages, Cursor rules, and default/fallback strings are English. Existing German locale _values_ in `src/i18n/*Translations.ts` stay as-is; new UI strings need both EN and DE keys, rendered via `t()`.
- File size target 200–400 lines, hard max 700. Split large views into `FeatureView.tsx` + `FeatureViewContext.tsx` + `useFeatureLogic.ts` (see the Authors/Journals/Knowledge-Base views for the pattern).
- New persistent data requires an explicit Dexie schema version bump + migration in `databaseService.ts`, plus a `CHANGELOG.md` entry if breaking.
- All HTML/Markdown is sanitized with DOMPurify; no bare `dangerouslySetInnerHTML`; prompt fragments go through `lib/promptSanitize.ts`; CSV export must stay formula-injection-safe.
- New feature checklist: Redux slice/RTK Query endpoint → Dexie schema (if persisted) → i18n EN+DE → Framer Motion transition → ARIA/keyboard support → unit test stub.
- Chart library is Recharts only (ADR 0005) — do not reintroduce Chart.js.
- **Dual merge gate** (`docs/pr-merge-gate.md`, rules `011`/`013`): required CI green **and** review quiescence on the same latest head, including the **arrival wait**. Do not merge while CodeAnt/Greptile/Copilot/CodeRabbit are still “Reviewing”. GraphQL `reviewThreads` = 0 is not enough if a bot has not finished arriving. Resolve _all_ automated review-bot comments (CodeRabbit, CodeAnt, Copilot, DeepSource AI Review, CodeScene, Greptile, etc.), including nitpicks and out-of-diff items.
- **Always** comment `@deepsourcebot review` on PR open and after every fix push. For CodeRabbit rate limits: wait the stated cooldown, then `@coderabbitai review` (max 3 cycles / escalate after >90m). After that threshold, optional-CodeRabbit is Sourcery stand-in **or** the 2026-09-03 skip when Sourcery cannot stand in (budget exhausted, or no real review is available). Do **not** `@sourcery-ai review` while the 250k / 7-day budget is exhausted. Optional on-demand `@claude` via `.github/workflows/claude.yml`; automated Claude Code Review is **not** in CI.
- Concurrency: workflows cancel in-progress runs on `pull_request` only — never cancel an in-flight `main` validation/deploy (`docs/ci-branch-governance.md`).

## Code intelligence (local, not committed)

This repo has both `codegraph` (`.codegraph/` — fast deterministic symbol/call-graph index; `codegraph query|explore|node|callers|callees|impact`) and `graphify` (`graphify-out/` — code+docs knowledge graph with community clusters, `GRAPH_REPORT.md`, `graph.html`, `wiki/`) set up. Both are **fully gitignored here** — this project is solo-dev, so the general "commit `graphify-out/*` for the team" policy in the ancestor `~/CLAUDE.md` (Omni-Archive team policy) does not apply to this repo; everything regenerates locally (`codegraph init .`, `/graphify .`). A `.husky/post-commit` hook keeps both in sync after every commit via free/deterministic updates only (`codegraph sync -q`, `graphify update .`) — no LLM calls, so it never costs tokens. Each runs backgrounded (`nohup ... &`) and only if the binary is present, so `git commit` returns immediately regardless of whether the tools are installed; the commit itself is never blocked or affected by either command.

## Testing notes

- Unit/integration specs are colocated `*.test.ts(x)` next to their source. `src/test/setup.ts` mocks IndexedDB and Web Crypto; `fake-indexeddb` is available for DB-heavy tests. Keep specs deterministic (mock network/AI/crypto calls) and isolated (no shared mutable state across files) — never comment out or delete a failing test to get CI green.
- E2E specs live in `src/test/e2e/` (seven blocking Chromium specs + separate `a11y.spec.ts`); the same seven run on Firefox/WebKit/mobile Chrome (`e2e-cross-browser.yml`, also blocking). Playwright auto-starts the Vite dev server and uses a fake Gemini key. Prefer `getByRole` selectors; justify any `sleep`.
- **Full E2E suite runs belong in CI, not on the local dev machine.** This project runs on a resource-constrained (~3.7 GB RAM) local box; the full suite reliably exhausts it or gets killed outright. Locally, only run a single spec file or a scoped `-g "<pattern>"` subset. For a genuine full-suite result, read the blocking Playwright checks on the PR: Chromium (`e2e.yml`) and cross-browser (`e2e-cross-browser.yml`) via `gh run view <run-id> --log` — a cancelled WebKit job during `playwright install-deps` is incomplete validation, not a suite failure (see `docs/e2e-ci-backlog.md`).
- **The same cloud-first principle applies to `pnpm run test:coverage`.** It's not RAM-fatal the way the full E2E suite is, but it routinely runs past this box's own 120s foreground timeout and gets auto-backgrounded — repeating it before every push is wasted local resource on a machine that's already tight on RAM. Locally, run `pnpm exec vitest run <changed-file>.test.ts` for fast, targeted feedback while editing. Treat the "Typecheck, Lint & Tests" GitHub Actions job (`.github/workflows/deploy.yml`, blocking/required, not `continue-on-error`) as the authoritative full-suite-plus-coverage-gate result — read it with `gh run view <run-id> --log` or the PR's check output after pushing, rather than running `pnpm run test:coverage` locally as a matter of routine. A local full run is still fine when you specifically want the coverage table in front of you before writing new tests, or when iterating on a coverage-threshold failure itself.
