# Contributing to AI Research Orchestrator

Thank you for improving this project. This document describes how to work on the codebase and what CI expects.

## Prerequisites

- Node.js **18+** (CI uses `lts/*`)
- npm

## Getting started

```bash
git clone https://github.com/qnbs/AI-Research-Orchestrator.git
cd AI-Research-Orchestrator
npm ci
npm run dev
```

Copy `.env.example` if you use local env vars; **never** commit API keys.

## Quality checks (run before opening a PR)

```bash
npm run typecheck   # TypeScript --noEmit
npm run test:run    # Vitest unit tests
npm run build       # Production build
```

Optional E2E (requires browsers once):

```bash
npx playwright install chromium
npm run test:e2e
```

## Pull requests

- Target branch: **`main`**
- Describe **what** changed and **why** in the PR description
- Keep changes focused; avoid unrelated refactors
- New user-visible strings: add keys in **English and German** in `src/i18n/translations.ts`

## Continuous integration

GitHub Actions (`.github/workflows/deploy.yml`) on pushes and PRs to `main`:

1. `npm ci`
2. `npx tsc --noEmit`
3. `npx vitest run`
4. `npm run build`

Deployment to GitHub Pages runs only for pushes (and manual dispatch) on `main`, not for pull requests.

## AI-assisted development (Cursor)

See **`AGENTS.md`** and **`.cursor/rules/`** for conventions the coding agent should follow.
