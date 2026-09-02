# Copilot / agent instructions

You are an expert React 19 + TypeScript engineer working on **AI Research Orchestrator** — a client-only PWA for agentic biomedical literature research (PubMed/arXiv + multi-provider AI or heuristic fallback).

**Canonical entry points (prefer these over this file if anything conflicts):**

1. Repo root [`AGENTS.md`](../AGENTS.md)
2. [`.cursor/index.mdc`](../.cursor/index.mdc) (always-on manifest)
3. [`.cursor/rules/`](../.cursor/rules/) (modular `.mdc` rules — see `000-cursor-rules.mdc`)
4. [`docs/adr/README.md`](../docs/adr/README.md) (ADRs 0001–0021)
5. [`docs/ci-branch-governance.md`](../docs/ci-branch-governance.md) + [`docs/project-facts.json`](../docs/project-facts.json)

## Tech stack (current)

| Category          | Technology                                                                    | Notes                                                                             |
| ----------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Framework         | React 19                                                                      | Suspense, lazy views                                                              |
| Language          | TypeScript 6.0                                                                | **strict**                                                                        |
| Build             | Vite **8**                                                                    | + visualizer, terser                                                              |
| State / APIs      | Redux Toolkit 2 + RTK Query                                                   | `researchApi`, `geminiApi`                                                        |
| Local DB          | Dexie 4 + dexie-react-hooks                                                   | IndexedDB only — no app backend                                                   |
| AI                | `@google/genai`, `openai`, `@anthropic-ai/sdk`, Ollama `fetch`, **heuristic** | Lazy-loaded via `getProviderForSettings()`; default live model `gemini-2.5-flash` |
| Styling           | Tailwind CSS v4 (`@tailwindcss/postcss`)                                      | Cybernetic glassmorphism                                                          |
| Charts            | **Recharts only** (ADR 0005)                                                  | Do not re-add Chart.js                                                            |
| UI extras         | Framer Motion 12, cmdk, `@tanstack/react-virtual`                             | Custom icons; unused `lucide-react` removed                                       |
| Export / sanitize | jsPDF + marked, DOMPurify                                                     |                                                                                   |
| Tests             | Vitest + Testing Library; Playwright                                          | Blocking Chromium + blocking cross-browser + axe                                  |
| Toolchain         | Node ≥22, pnpm 11                                                             | `pnpm install --frozen-lockfile`                                                  |

## Architecture (always follow)

- **Local-first**: User data (reports, history, settings, KB, collections) in IndexedDB via Dexie — **no application backend**. Live mode still sends prompts/metadata to the selected AI provider and PubMed/arXiv (see `SECURITY.md` / README).
- **Multi-provider**: Transports in `src/services/providers/`; feature façade `geminiService.ts` (`aiJson` / `liveResearchReportStream` / `literatureAiTools` behind it) never imports a vendor SDK directly (ADR 0008).
- **InferenceMode** `live | heuristic`: never dead-end on missing key/offline — use `src/services/nonAi/` (ADR 0007/0009). Explicit educational demo is quarantined (ADR 0016).
- **Grounding**: corpus-validated where implemented; synthesis trust is `claim-supported` / `corpus-supported` vs unverified narrative draft (ADR 0012, 0015, **0018** — do not reintroduce overclaiming `verified` wire values). Cancelled or restored reports are `'partial'`, never `'done'` (ADR **0021**).
- **Keys**: AES-GCM encrypted IndexedDB via `apiKeyService.ts` — never `VITE_*` secrets.
- **State**: Redux is SoT; Context only hydrates/composes — never duplicate the same flags.
- **PWA / CSP**: `public/sw.js`, CSP hash patched on build; no CDN import map (ADR 0011).

## Code style

- TypeScript strict — no `any` unless unavoidable; functional components + hooks only
- English-only new repo content (rule `010`); UI strings EN+DE via `t()`
- File size target 200–400 lines, hard max 700 — split large views (`FeatureView` + Context + `useFeatureLogic`)
- Sanitize HTML/Markdown with DOMPurify; prompt fragments via `lib/promptSanitize.ts`

## Testing & CI

- Unit: colocated `*.test.ts(x)`; mock network/AI/crypto; coverage gate on `store`/`services`/`hooks`/`lib`
- E2E (blocking): seven Chromium specs in `e2e.yml`; same seven on Firefox/WebKit/mobile Chrome in `e2e-cross-browser.yml`; separate `a11y.yml`
- **Core flows** (orchestration, Knowledge Base, `src/services`): run `typecheck`, `lint`, and `test:coverage` before push (or confirm the blocking CI coverage job on the PR)
- For unrelated UI edits, scoped Playwright/`vitest` locally is fine; still read full coverage/E2E from CI logs before merge
- **PR process gates:** always `@deepsourcebot review` after open/fix push; resolve CodeRabbit/CodeAnt/Copilot/DeepSource threads (rules `011`/`013`); PR-only workflow `cancel-in-progress` (never cancel in-flight `main`)
- Required checks inventory: `docs/ci-branch-governance.md` (live ruleset `mainrules`)

## Safety

- Never commit API keys or secrets
- Never break the orchestrator pipeline or Knowledge Base silently
- Always keep i18n EN+DE parity for new UI strings
- Run `pnpm run typecheck` before committing; Husky runs typecheck / `check:fast`

## New feature checklist

1. Redux slice or RTK Query endpoint
2. Dexie schema bump + migration if persisted
3. i18n EN + DE
4. Framer Motion transition where appropriate
5. ARIA / keyboard support
6. Unit test stub (happy + failure + abort for external calls)

## Project structure (abbreviated)

```text
src/
  App.tsx, services/geminiService.ts, services/providers/, services/nonAi/
  store/slices/, components/, hooks/, contexts/, i18n/, lib/, test/e2e/
docs/adr/, docs/ci-branch-governance.md, docs/project-facts.json
.github/workflows/{deploy,e2e,e2e-cross-browser,a11y,security}.yml
```
