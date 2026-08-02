# DeepSource setup notes

## JavaScript analyzer (optional)

If the **DeepSource: JavaScript** GitHub check stays red despite `.deepsource.toml`:

1. Open [DeepSource dashboard](https://app.deepsource.com/gh/qnbs/AI-Research-Orchestrator) → **Settings** → **Code Review**.
2. **Disable the JavaScript analyzer** (or remove it from required checks in GitHub branch protection).
3. Keep **Docker** and **Shell** if desired — both pass cleanly.

## Authoritative JS/TS gates

This repository enforces quality via:

- `pnpm run typecheck`
- `pnpm run lint` (ESLint 9, zero warnings)
- `pnpm run test:coverage` (80% logic-layer floors)
- Playwright E2E (CI)

DeepSource JavaScript is **advisory only** and has produced persistent false positives on TypeScript ESM exports and Node `.mjs` maintenance scripts.

## Autofix PRs

DeepSource Autofix opens branches like `deepsource-autofix-*`. Consolidate into the active feature PR (do not merge autofix branches directly to `main` without running the deploy workflow gates).
