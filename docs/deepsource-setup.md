# DeepSource setup notes

## JavaScript analyzer

The JavaScript analyzer is **enabled** in `.deepsource.toml` with excludes for:

- `scripts/**` — Node maintenance `.mjs` (parse as script, not ESM modules)
- `public/**` — service-worker bundles (Workbox global false positives)

If the **DeepSource: JavaScript** GitHub check stays red on excluded paths, verify excludes in the dashboard match `.deepsource.toml` before disabling the analyzer.

## Authoritative JS/TS gates

This repository enforces quality via:

- `pnpm run typecheck`
- `pnpm run lint` (ESLint 9, zero warnings)
- `pnpm run test:coverage` (80% logic-layer floors)
- Playwright E2E (CI)

DeepSource JavaScript is **advisory only** and has produced persistent false positives on TypeScript ESM exports and Node `.mjs` maintenance scripts.

## Autofix PRs

DeepSource Autofix opens branches like `deepsource-autofix-*`. Consolidate into a tested feature PR (see `docs/deepsource-disposition.md`); do not merge autofix branches directly to `main` without running deploy workflow gates.
