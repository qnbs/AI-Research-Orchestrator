# DeepSource setup notes

## DeepSource AI Review — **mandatory process gate** (2026-08-03)

Team AI Review for this repository is **on-demand**. Static analysis checks alone
(Docker/Shell grades) are **not** a completed review.

1. After opening a PR, comment `@deepsourcebot review`.
2. After **every** fix push, comment `@deepsourcebot review` again.
3. Address AI Review findings in the correction loop (rules `011` / `013`) before merge.
4. Do not treat DeepSource AI Review as a substitute for deterministic CI
   (`deploy.yml`, E2E, cross-browser, a11y, security) — see `docs/ci-branch-governance.md`.

## JavaScript analyzer — **disabled** (2026-08-02)

The JavaScript analyzer is **not declared** in `.deepsource.toml`. Disable it in the **DeepSource dashboard** — see **`docs/deepsource-dashboard-off.md`** and **`docs/deepsource-javascript-ci.md`**.

**Authoritative JS/TS gates** in this repository:

- `pnpm run typecheck`
- `pnpm run lint` (ESLint 9, zero warnings)
- `pnpm run test:coverage` (80% logic-layer floors)
- Playwright E2E (CI)

Docker and Shell analyzers remain **enabled** (advisory GitHub checks).

## Re-enabling JavaScript (maintainers)

1. Add `[[analyzers]] name = "javascript"` with `enabled = true` in `.deepsource.toml`.
2. Set `deepsourceJavaScriptEnabled: true` in `docs/project-facts.json`.
3. Enable JavaScript in the DeepSource dashboard (Settings → Code Review → Analyzers).
4. Adjust dashboard quality gates (limit to critical/security) or add repository-wide ignore rules.
5. Push a test PR and confirm `DeepSource: JavaScript` stays green before treating the check as merge-blocking.

## Verifying dashboard-off (maintainers)

After toggling JavaScript **off** in the dashboard:

1. Push an empty commit or doc-only change to an open PR.
2. Confirm the PR checks list has **no** `DeepSource: JavaScript` failure (check absent or success).
3. Record confirmation in the PR disposition comment if this was the remediation step.

See `docs/deepsource-dashboard-off.md` for the toggle path.

## Excludes (when JS is re-enabled)

- `scripts/**` — Node maintenance `.mjs` (parse as script, not ESM modules)
- `public/**` — service-worker bundles (Workbox global false positives)

## Autofix PRs

DeepSource Autofix opens branches like `deepsource-autofix-*`. Consolidate into a tested feature PR (see `docs/deepsource-disposition.md`); do not merge autofix branches directly to `main` without running deploy workflow gates.
