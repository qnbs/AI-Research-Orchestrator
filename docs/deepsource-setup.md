# DeepSource setup notes

## JavaScript analyzer — **disabled** (2026-08-02)

The JavaScript analyzer is **disabled** in `.deepsource.toml`. See **`docs/deepsource-javascript-ci.md`** for the root-cause analysis (ESM false positives, `scripts/lib` parse errors, quality-gate churn).

**Authoritative JS/TS gates** in this repository:

- `pnpm run typecheck`
- `pnpm run lint` (ESLint 9, zero warnings)
- `pnpm run test:coverage` (80% logic-layer floors)
- Playwright E2E (CI)

Docker and Shell analyzers remain **enabled** (advisory GitHub checks).

## Re-enabling JavaScript (maintainers)

1. Set `enabled = true` under `[[analyzers]] name = "javascript"` in `.deepsource.toml`.
2. Set `deepsourceJavaScriptEnabled: true` in `docs/project-facts.json`.
3. Adjust DeepSource dashboard quality gates (limit to critical/security) or add repository-wide ignore rules.
4. Prove one full PR stays green before treating the check as merge-blocking.

## Excludes (when JS is re-enabled)

- `scripts/**` — Node maintenance `.mjs` (parse as script, not ESM modules)
- `public/**` — service-worker bundles (Workbox global false positives)

## Autofix PRs

DeepSource Autofix opens branches like `deepsource-autofix-*`. Consolidate into a tested feature PR (see `docs/deepsource-disposition.md`); do not merge autofix branches directly to `main` without running deploy workflow gates.
