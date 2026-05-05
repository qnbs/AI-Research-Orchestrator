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
pnpm run typecheck    # TypeScript --noEmit
pnpm run lint         # ESLint (warnings budget — see package.json)
pnpm run test:coverage # Vitest + coverage thresholds (logic layers — vitest.config.ts)
pnpm run build        # Production build
```

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
