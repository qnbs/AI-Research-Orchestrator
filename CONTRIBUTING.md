# Contributing to AI Research Orchestrator

Thank you for improving this project. This document describes how to work on the codebase and what CI expects.

## Prerequisites

- Node.js **22+** (CI uses `22`)
- pnpm 11

## Getting started

```bash
git clone https://github.com/qnbs/AI-Research-Orchestrator.git
cd AI-Research-Orchestrator
pnpm install --frozen-lockfile
pnpm run dev
```

Copy `.env.example` if you use local env vars; **never** commit API keys.

## State management (Redux-first)

- **Domain state** (settings, UI chrome, knowledge base, collections, theme, Gemini/PubMed caches) lives in **Redux** (`src/store/`). Prefer RTK Query slices (`researchApi`, `geminiApi`) for networked data.
- **`SettingsProvider`** only hydrates Redux once from IndexedDB via `useSettings`; no parallel settings store.
- **`useUI`** reads/writes **`uiSlice`** (navigation, notifications). `UIContext` is a barrel — do not add duplicate navigation state elsewhere.
- **Feature contexts** (`KnowledgeBaseViewContext`, `PresetContext`, view-specific `*ViewContext`) may hold **local UI** (filters, pagination, panel visibility). Avoid duplicating the same facts in Context and Redux; pick one source of truth per fact.

## Quality checks (run before opening a PR)

```bash
pnpm run check:fast   # typecheck + lint + format:check + conflict-marker scan (Husky pre-push)
pnpm run typecheck    # TypeScript --noEmit
pnpm run lint         # ESLint (zero-warning gate)
pnpm run test:coverage # Vitest + coverage thresholds (logic layers — vitest.config.ts)
pnpm run build        # Production build
```

### Git hooks (Husky)

| Hook           | Runs                                                                              |
| -------------- | --------------------------------------------------------------------------------- |
| **pre-commit** | `lint-staged`, full-project `typecheck`, `format:check`, `check:conflict-markers` |
| **pre-push**   | `check:fast` (typecheck, lint, format:check, conflict markers)                    |

Do **not** use `git commit --no-verify` or `git push --no-verify` to bypass hooks unless a hook is broken and you document the reason in the PR. Bypassing hooks is how TypeScript errors (e.g. incomplete test types) reach CI after push.

Optional E2E (requires browsers once):

```bash
pnpm exec playwright install chromium
pnpm run test:e2e
```

## Pull requests

- Target branch: **`main`**
- Describe **what** changed and **why** in the PR description
- Keep changes focused; avoid unrelated refactors
- New user-visible strings: add keys in **English and German** in `src/i18n/translations.ts`

### Automated review correction loop (required before merge)

1. Push fixes; wait for **blocking CI** green on the latest commit (`deploy.yml` + Chromium/cross-browser E2E).
2. **Always** comment `@deepsourcebot review` on the PR after open and after **every** fix push (DeepSource AI Review is on-demand for this team — static analysis alone is not enough; see `docs/deepsource-setup.md`).
3. **Always** ensure CodeRabbit reviewed the latest head: if the check says **Review rate limited**, parse **Next review available in: N minutes**, wait `N` (+ a few minutes buffer), then comment `@coderabbitai review` and repeat (max **3** wait/re-trigger cycles per head; escalate to a maintainer after that or if a single wait exceeds **90 minutes**) until a real review lands — do not merge on a rate-limit placeholder.
4. Address **every** open inline thread from CodeRabbit, CodeAnt, Copilot, DeepSource AI Review (and any other bot reviewers listed in `.cursor/rules/013-pr-review-correction-loop.mdc`).
5. Read latest bot **review summaries** — CodeRabbit out-of-diff items often appear only in the review body.
6. Reply on each thread (cite fix commit) and **resolve** the conversation.
7. Re-poll after bots finish on the new commit; re-trigger DeepSource/CodeRabbit as above after every fix push.
8. Merge only when CI is green and no new actionable bot comments remain.

DeepSource dashboard JavaScript analyzer remains off / advisory (`docs/project-facts.json`). Chromium and cross-browser Playwright E2E are **blocking**. Post a short disposition comment when closing a large review batch.

See `.cursor/rules/011-coderabbit-pr-gate.mdc` and `.cursor/rules/013-pr-review-correction-loop.mdc` for agent/maintainer detail.

## Continuous integration

Blocking gates on pushes and PRs to `main` (see `docs/ci-branch-governance.md` for the full inventory and branch-protection expectations):

1. `deploy.yml` — `pnpm install --frozen-lockfile` → `pnpm audit --audit-level=high` → typecheck → lint → `format:check` → `test:coverage` → coverage floors → build → `bundle:budget` → Lighthouse CI
2. `e2e.yml` — Chromium Playwright suite (blocking)
3. `e2e-cross-browser.yml` — Firefox / WebKit / mobile Chrome (blocking)
4. `a11y.yml` — axe critical/serious smoke
5. `security.yml` — CodeQL, Dependency Review, audit, gitleaks

Concurrency cancels superseded **PR** runs only; in-flight `main` validation/deploy is never cancelled mid-run.

Deployment to GitHub Pages runs only for pushes (and manual dispatch) on `main`, not for pull requests. Quality/audit decisions: `docs/audit-governance.md`.

## AI-assisted development (Cursor)

See **`AGENTS.md`** and **`.cursor/rules/`** for conventions the coding agent should follow.
