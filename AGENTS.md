# AI Research Orchestrator — Agent Guide

Guidance for AI coding agents (Kimi, Cursor, Copilot) working in this repository. Assumes no prior project knowledge. Follow it together with the required reading listed below.

## Project Overview

**AI Research Orchestration Author** (`ai-research-orchestrator`, v0.2.1, MIT, private package) is a **client-only React 19 PWA** for agentic biomedical literature research. It couples **PubMed (NCBI E-utilities)** and **arXiv** retrieval with a **pluggable AI provider layer** (Google Gemini, OpenAI, Anthropic, local Ollama, or the deterministic heuristic fallback) to autonomously run literature reviews: query formulation → live fetch → semantic ranking (0–100 relevance) → streaming, cited synthesis.

- **Local-first / zero backend**: all user data (reports, history, settings, knowledge base, collections) lives in the browser's IndexedDB via Dexie 4. No server stores anything.
- **Direct-to-API**: the browser talks directly to the selected AI provider, `eutils.ncbi.nlm.nih.gov`, and `export.arxiv.org` (see CSP in `index.html`).
- **Grounding**: every AI assertion is linked to a verifiable PubMed ID (PMID).
- **Live demo / deployment**: GitHub Pages at `https://qnbs.github.io/AI-Research-Orchestrator/` (base path `/AI-Research-Orchestrator/`).

Main features: Orchestrator pipeline, Knowledge Base (dedup, faceted filtering, charts), Rapid Research Assistant (TL;DR, similar articles, report chat), scientometric Author/Journal hubs, Collections, Agent Debugger (visual traces), Dashboard, History, and export to JSON/CSV/RIS/BibTeX/PDF.

## Required Reading (in order)

1. **`.github/copilot-instructions.md`** — current stack, folder structure, state management, testing, safety rules.
2. **`.cursor/index.mdc`** — always-on project manifest.
3. **`.cursor/rules/*.mdc`** — contextual rules (Security, APIs, Architecture, UI, QA — numbering scheme in `000-cursor-rules.mdc`).
4. **`docs/adr/`** — architecture decisions (0001 state management … 0008 multi-provider architecture).

## Technology Stack

| Area                 | Technology                                                                                                           |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Framework / Language | React 19 (Suspense, lazy views), TypeScript 5.8 **strict**                                                           |
| Build                | Vite 6 (+ `rollup-plugin-visualizer`, terser)                                                                        |
| State                | Redux Toolkit 2 + RTK Query (`apiSlice` = researchApi, `geminiApiSlice` = geminiApi)                                 |
| Local DB             | Dexie 4 + dexie-react-hooks (IndexedDB), single entry `src/services/databaseService.ts`                              |
| AI                   | `@google/genai`, `openai`, `@anthropic-ai/sdk` (lazy-loaded), Ollama `fetch`, **or** local heuristic inference layer |
| Styling              | Tailwind CSS v4 (`@tailwindcss/postcss`), "Cybernetic" glassmorphism design system                                   |
| UI extras            | Framer Motion 12, lucide-react, cmdk (`⌘+K` palette), @tanstack/react-virtual                                        |
| Charts               | Recharts (ADR 0005 — Recharts-only; do not re-add Chart.js)                                                          |
| Export / sanitize    | jsPDF + marked, DOMPurify                                                                                            |
| Tests                | Vitest + Testing Library (jsdom), Playwright (Chromium)                                                              |
| Toolchain            | Node **≥22**, pnpm **11** (`packageManager: pnpm@11.13.1`), ESLint 9 + Prettier, husky + lint-staged                 |

## Runtime Architecture

- **Agentic pipeline**: implemented in **`src/services/geminiService.ts`** (AsyncGenerator `generateResearchReportStream`): query generation → PubMed/optional arXiv fetch → ranking → streaming synthesis. `App.tsx` `getAgentForPhase()` maps phases to **conceptual agent roles** for the trace/debug UI (QueryGenerator, PubMedFetcher, ArxivFetcher, Ranker, Synthesizer) — these are prompt/phase roles, not separate SDK processes.
- **AI provider layer**: transport adapters live in `src/services/providers/` (`gemini.ts`, `openai.ts`, `anthropic.ts`, `ollama.ts`, `heuristic.ts`) and are loaded lazily via `getProviderForSettings()` so SDKs do not inflate the initial bundle. `geminiService.ts` remains the feature façade and routes AI calls through the selected provider.
- **InferenceMode** `live | heuristic`: derived from API-key presence, `navigator.onLine`, and an optional Force-Heuristic toggle (`src/services/inferenceMode.ts`, `resolveActiveInferenceMode.ts`, hook `useInferenceMode`). Without a key or offline, the app **never** throws `NO_API_KEY` into an empty UI — the deterministic heuristic layer (`src/services/heuristics/`: query formulation, lexical ranking, template synthesis, extractive TL;DR, report-grounded chat, author/journal tools, demo corpus) keeps every feature usable (ADR 0007).
- **State**: Redux is the single source of truth (slices: settings, ui, knowledgeBase, collections, theme, agentDebug + RTK Query slices). Contexts only hydrate/compose: `SettingsProvider` hydrates IndexedDB → Redux once; `KnowledgeBaseContext`/`PresetContext` compose Dexie + Redux actions; `UIContext` is a barrel. **Never duplicate** the same flags in Context and Redux.
- **Resilience**: external calls use typed `AppError`/`toAppError` (`src/lib/errors.ts`), circuit breakers (`src/lib/circuitBreaker.ts` — never retry `AbortError`), exponential backoff honoring `Retry-After` (`src/lib/resilience.ts`, `pubmedUtils.ts`). See `.cursor/rules/102-resilience-external-calls.mdc`.
- **Security model**: provider API keys (Gemini `AIza…`, OpenAI `sk-…`, Anthropic `sk-ant-…`) and the optional NCBI key are entered in Settings → AI Configuration and stored **AES-GCM encrypted** in IndexedDB via `apiKeyService.ts` (per-provider storage slot, legacy key migrates to Gemini slot). Keys are **not** env secrets — `.env.example` is documentation only; never put secrets in `VITE_*` (client-visible). Threat model: `SECURITY.md` + ADR 0003.
- **PWA**: service worker `public/sw.js`, `public/manifest.json`; production SPA routing via `404.html` fallback. `index.html` carries a CSP meta (hashes for inline JSON-LD/importmap) and an import map loading React & co. from `aistudiocdn.com`; `pnpm run build` runs `scripts/patch-csp-hashes.mjs` to re-hash after bundling.

## Code Organization

```
src/
  App.tsx                # Root: lazy-loaded views, phase→agent trace mapping
  index.tsx, index.css   # Entry; Tailwind v4 + custom CSS
  types.ts, types/ui.ts  # Shared TypeScript interfaces
  components/            # Views + primitives; subfolders: icons/, ui/, settings/,
                         # knowledge-base/, authors/, journals/, agentDebugger/
  contexts/              # Settings / KnowledgeBase / Preset / UI providers (hydration & composition only)
  hooks/                 # useSettings, useUI, useTranslation, useChat, useResearchAssistant,
                         # useInferenceMode, useUrlSync, useFocusTrap, useHaptic, …
  i18n/translations.ts   # EN + DE strings (both locales required for new UI text)
  lib/                   # errors, circuitBreaker, resilience, promptRegistry, promptSanitize,
                         # parseGeminiJson, researchCheckpoint, agentEval, heuristicEval, …
  services/              # geminiService (feature façade), apiKeyService, databaseService, pubmedUtils,
                         # arxivUtils, exportService, journalService, inferenceMode,
                         # researchOrchestratorAdapter, providers/ (transport adapters),
                         # heuristics/ (offline inference layer)
  store/                 # store.ts, hooks.ts, slices/ (one slice per domain + *.test.ts)
  test/                  # setup.ts (IndexedDB + crypto mocks), e2e/ (agent-flow, smoke specs)
scripts/                 # patch-csp-hashes, check-bundle-budget, generate-pwa-icons
docs/adr/                # Architecture Decision Records 0001–0008
```

## Build, Test & Quality Commands

```bash
pnpm install --frozen-lockfile   # install (Node ≥22, pnpm 11)
pnpm run dev                     # Vite dev server — port 3000, host 0.0.0.0
pnpm run build                   # production build + CSP hash patching → dist/
pnpm run preview                 # preview built app — port 4173
pnpm run typecheck               # tsc --noEmit (strict)
pnpm run lint                    # ESLint 9, warning budget --max-warnings 650
pnpm run test:run                # Vitest, fast loop
pnpm run test:coverage           # Vitest + v8 coverage — gated (see below)
pnpm run test:e2e                # Playwright, full suite — CI only, do NOT run locally (see below)
pnpm run bundle:budget           # gzip budget gate: chunk ≤200 kB, entry ≤400 kB, charts ≤180 kB
pnpm run analyze                 # bundle visualizer (dist/stats.html)
pnpm run test:lighthouse         # build + Lighthouse CI
pnpm run format                  # Prettier write (src + root md/json)
```

- **Coverage gate** (`vitest.config.ts`): scoped to logic layers (`src/store`, `src/services`, `src/hooks`, `src/lib`) — **80% lines/statements, 55% branches/functions**.
- **Pre-commit**: husky runs `lint-staged` (eslint --fix + prettier).
- **Before touching the core flow** (orchestration, KB, services), run: `typecheck`, `lint`, `test:coverage` — same as CI.

## CI / CD

- **`.github/workflows/deploy.yml`** (push + PR to `main`): `pnpm install --frozen-lockfile` → `pnpm audit --audit-level=high` → typecheck → lint → `test:coverage` → build → `bundle:budget` → Lighthouse CI (assertions: a11y/best-practices/SEO ≥ 0.95, performance ≥ 0.85 warn). **GitHub Pages upload/deploy only on `refs/heads/main` (non-PR).** Actions are pinned by SHA.
- **`.github/workflows/security.yml`**: CodeQL, Dependency Review, `pnpm audit --audit-level=high`, gitleaks secret scan.
- **Dependabot**: process every open Dependabot PR individually with gates green; document disposition in `docs/dependabot-disposition.md` (rule `012`). Never bulk-close.

## Conventions & Code Style

- **English-only repository content** (rule `010`, since 2026-07-16): all new/edited docs, comments, JSDoc, commit messages, CI text, and default/fallback strings must be English. **Exception**: existing German locale values in `src/i18n/translations.ts` stay; new UI strings need **EN + DE keys** and must render via `t()`.
- TypeScript strict — no `any` unless unavoidable; functional components + hooks only.
- **File size**: target 200–400 lines, hard max 700 (rule `200`). Split large views into `FeatureView.tsx` + `FeatureViewContext.tsx` + `useFeatureLogic.ts` (see Authors/Journals/Knowledge-Base patterns).
- New persistent data → explicit Dexie schema version bump + migration in `databaseService.ts`; defaults documented; breaking changes in `CHANGELOG.md`.
- All HTML/Markdown sanitized with DOMPurify; no `dangerouslySetInnerHTML` outside reviewed patterns; prompt fragments sanitized (`lib/promptSanitize.ts`); CSV export is formula-injection-safe.
- Accessibility: WCAG 2.2 AA — ARIA roles, keyboard navigation, focus management, `⌘+K` palette; honor jsx-a11y (no blanket eslint-disables).
- **New feature checklist**: Redux slice or RTK Query endpoint → Dexie schema (if persisted) → i18n EN+DE → Framer Motion transition → ARIA/keyboard → unit test stub.
- **PR gates**: resolve **all** automated review-bot comments (CodeRabbit, CodeAntai, …) including nitpicks and out-of-diff items — loop until clear before merging (rule `011`). PRs target `main`, focused changes, English description.
- PRs additionally receive an automated Claude Code review (`.github/workflows/claude-code-review.yml`, alongside `.github/workflows/claude.yml` for on-demand `@claude` mentions). Its findings land as inline review threads the same way CodeRabbit's do — read both channels before merge. CodeRabbit's out-of-diff findings still only ever appear in the review body text, never as a thread; keep checking the paginated review body every pass, per the standing lesson already captured for CodeRabbit.

## Testing Strategy

- **Unit/integration (Vitest, jsdom)**: colocated `*.test.ts(x)` next to sources (services, slices, hooks, lib, components). Setup `src/test/setup.ts` mocks IndexedDB and Web Crypto; `fake-indexeddb` available for DB tests. Tests must be **deterministic** — mock Gemini/PubMed/arXiv/network/crypto; never comment out or delete tests to pass CI; specs run in isolation (no shared mutable state).
- **E2E (Playwright, Chromium only)**: `src/test/e2e/` (`agent-flow.spec.ts`, `smoke.spec.ts`). Config auto-starts the Vite dev server on port 3000 and uses a fake Gemini key; prefers stable `getByRole` selectors; `sleep` only with justification. One-time setup: `pnpm exec playwright install chromium`.
  - **Run the full suite (`pnpm run test:e2e`, both spec files) only in CI, never on the local dev machine** — on constrained hardware (~3.7 GB RAM) it reliably gets OOM-killed regardless of whether the code under test is correct. Locally, scope to one spec file or a `-g "<pattern>"` subset. To confirm a genuine full-suite result, read the `.github/workflows/e2e.yml` "Playwright E2E" check's own log/artifact on the PR — it already runs on every push. That job is `continue-on-error: true`, so its green badge alone doesn't prove 0 failures; check the actual test output count.
- Every new external call path needs happy-path + failure + abort coverage (rule `102`).

## Security Considerations

- **Never commit API keys or secrets.** User keys live only in the encrypted IndexedDB vault (`apiKeyService.ts`). Gitleaks + `pnpm audit --audit-level=high` run in CI.
- No stack traces/IDs in UI; user-facing errors via i18n; no sensitive logging in production.
- CSP baseline in `index.html`; keep `scripts/patch-csp-hashes.mjs` working when adding inline scripts.
- PubMed/arXiv: respect NCBI rate limits/backoff in `pubmedUtils.ts`; no scraping workarounds against NCBI ToS.

## Environment Notes (Cursor Cloud / containers)

- Single client-only service — no backend/DB/Docker needed. Keep long-running processes (dev server) in **tmux**.
- If Corepack/npm TLS to `registry.npmjs.org` fails, a standalone `pnpm-linux-x64` under `~/.local/bin` (GitHub release asset) usually works; `corepack enable` is preferred otherwise.
- DevContainer: `.devcontainer/` (postCreate installs Playwright Chromium; `SKIP_PLAYWRIGHT=true` to skip).
- Runtime egress needed: `aistudiocdn.com` (import map), Google Fonts, Gemini/NCBI/arXiv APIs.

## Human Documentation Map

- `README.md` — overview & setup (EN/DE) · `CONTRIBUTING.md` — workflow & PR expectations · `CHANGELOG.md`, `AUDIT.md` (living backlog), `SECURITY.md` (threat model) · `docs/` — audits, ADRs, i18n reviews · `.notes/meeting_notes.md` — dated decision log for later sessions.
