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

1. Push fixes; wait for **blocking CI** green on the latest commit (`deploy.yml`).
2. Address **every** open inline thread from CodeRabbit, CodeAnt, Copilot, DeepSource (and any other bot reviewers listed in `.cursor/rules/013-pr-review-correction-loop.mdc`).
3. Read latest bot **review summaries** — CodeRabbit out-of-diff items often appear only in the review body.
4. Reply on each thread (cite fix commit) and **resolve** the conversation.
5. Re-poll after bots finish on the new commit; wait through CodeRabbit rate limits if needed.
6. Merge only when CI is green and no new actionable bot comments remain.

DeepSource JavaScript is **advisory** by default (`docs/project-facts.json`). Chromium and cross-browser Playwright E2E are **blocking**. Post a short disposition comment when closing a large review batch.

See `.cursor/rules/011-coderabbit-pr-gate.mdc` and `.cursor/rules/013-pr-review-correction-loop.mdc` for agent/maintainer detail.

## Continuous integration

GitHub Actions (`.github/workflows/deploy.yml`) on pushes and PRs to `main`:

1. `pnpm install --frozen-lockfile`
2. `pnpm audit --audit-level=high`
3. `pnpm run typecheck`
4. `pnpm run lint`
5. `pnpm run test:coverage`
6. `pnpm run build`

Deployment to GitHub Pages runs only for pushes (and manual dispatch) on `main`, not for pull requests.

## AI-assisted development (Cursor)

See **`AGENTS.md`** and **`.cursor/rules/`** for conventions the coding agent should follow.
