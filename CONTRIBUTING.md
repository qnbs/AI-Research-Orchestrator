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
- Path owners: `.github/CODEOWNERS` (routing only; GitHub does not currently require Code Owner reviews)
- Describe **what** changed and **why** in the PR description
- Keep changes focused; avoid unrelated refactors
- New user-visible strings: add **English and German** keys in the matching `src/i18n/*Translations.ts` module and render via `t()`

### Theme visual QA (manual)

When a PR changes UI chrome, glass overlays, charts, or `@theme` tokens, run `pnpm run check:contrast` (including overlay-only color changes) and walk **dark**, **light**, and **matrix** on the touched surfaces (header, bottom nav, dialogs, empty states, primary CTA, charts and their accessible tables). For chart changes, also check labels, axes, legends, tooltip/focus, and that status is not color-only. Use existing tokens (`border-border`); do not introduce raw hex outside the token file. Do **not** add a screenshot suite to CI — record the pass in the PR template (`NOW-P1-THEME-QA`). Check N/A only when none of those surfaces changed.

### Dual merge gate (required before merge)

Full modus operandi: [`docs/pr-merge-gate.md`](docs/pr-merge-gate.md). Neither half is enough: **required CI green** on the latest head **and** **review quiescence** on that same SHA (including the arrival wait).

1. Push fixes; wait for **all required blocking checks** green on the latest commit (`deploy.yml`, `e2e.yml`, `e2e-cross-browser.yml`, `a11y.yml`, `pwa-e2e.yml`, `security.yml` — inventory in `docs/ci-branch-governance.md`). Do **not** use `--no-verify` to skip Husky.
2. **Always** comment `@deepsourcebot review` on the PR after open and after **every** fix push (DeepSource AI Review is on-demand — static analysis alone is not enough; see `docs/deepsource-setup.md`).
3. Best-effort `@coderabbitai review` when the latest head has no real CodeRabbit review. A **Review rate limited** check is **not** a merge blocker (`011` clause **(d)**). Still fix a real `CHANGES_REQUESTED` on this head. Do **not** comment `@sourcery-ai review` while the 250k / 7-day budget is exhausted.
4. **Arrival wait:** do not merge while CodeAnt / Greptile / Copilot / CodeScene / CodeRabbit still show “Reviewing” on the current head. GraphQL `reviewThreads` = 0 is not enough if a bot has not finished arriving (PR #299).
5. Address **every** open inline thread from bots **and humans** (CodeRabbit, CodeAnt, Copilot, DeepSource AI Review, and any other reviewer listed in `.cursor/rules/013-pr-review-correction-loop.mdc`).
6. Read **every** bot **and human** review body on the current head — CodeRabbit out-of-diff items and human top-level findings often appear only there. Track body-only findings in a disposition ledger.
7. Reply on each thread (cite fix commit) and **resolve** the conversation. An active human `CHANGES_REQUESTED` on this head blocks merge until superseded.
8. Re-poll after bots finish on the new commit; re-trigger DeepSource/CodeRabbit as above after every fix push.
9. Merge only when the complete `011` step 7 predicate holds: all required CI checks green **and** quiescence (arrival wait complete, no new actionable bot or human comments, every body-only finding disposed). GitHub `mergeStateStatus: BLOCKED` from a **superseded** `CHANGES_REQUESTED` (while `dismiss_stale_reviews_on_push` is off) is not a policy block — see `docs/pr-merge-gate.md`.

DeepSource dashboard JavaScript analyzer remains off / advisory (`docs/project-facts.json`). Chromium and cross-browser Playwright E2E are **blocking**. Post a short disposition comment when closing a large review batch.

See `.cursor/rules/011-coderabbit-pr-gate.mdc` and `.cursor/rules/013-pr-review-correction-loop.mdc` for agent/maintainer detail.

## Continuous integration

Blocking gates on pushes and PRs to `main` (see `docs/ci-branch-governance.md` for the full inventory and branch-protection expectations):

1. `deploy.yml` — `pnpm install --frozen-lockfile` → `check:audit-ignore-paths` → typecheck → lint → `format:check` → `test:coverage` → Codecov coverage + Test Analytics upload → coverage floors → build (Codecov bundle plugin) → `bundle:budget` → Lighthouse CI. Required `pnpm audit --audit-level=high` lives in `security.yml` (do not duplicate it here). Codecov is advisory (`docs/codecov.md`).
2. `e2e.yml` — Chromium Playwright suite (blocking)
3. `e2e-cross-browser.yml` — Firefox / WebKit / mobile Chrome (blocking)
4. `a11y.yml` — axe critical/serious smoke
5. `pwa-e2e.yml` — PWA service-worker registration (blocking)
6. `security.yml` — CodeQL, Dependency Review, audit, gitleaks

Concurrency cancels superseded **PR** runs only; in-flight `main` validation/deploy is never cancelled mid-run.

Deployment to GitHub Pages runs only for pushes (and manual dispatch) on `main`, not for pull requests. Quality/audit decisions: `docs/audit-governance.md`.

## AI-assisted development (Cursor)

See **`AGENTS.md`** and **`.cursor/rules/`** for conventions the coding agent should follow.
