# Codecov

Coverage, Test Analytics, and Javascript Bundle Analysis for this repo.
Dashboard: <https://app.codecov.io/gh/qnbs/AI-Research-Orchestrator>

`CODECOV_TOKEN` is an **organization** GitHub Actions secret. Workflows read
`${{ secrets.CODECOV_TOKEN }}`. Never put the token in `VITE_*` (client-visible)
or in the repo.

## What CI uploads

| Product             | How                                                                             | When                                         |
| ------------------- | ------------------------------------------------------------------------------- | -------------------------------------------- |
| **Coverage**        | Vitest `@vitest/coverage-v8` → `coverage/lcov.info` → `codecov/codecov-action`  | `deploy.yml` quality job after tests         |
| **Test Analytics**  | Vitest JUnit reporter → `junit.xml` → `codecov/test-results-action`             | Same quality job (`if: ${{ !cancelled() }}`) |
| **Bundle Analysis** | `@codecov/vite-plugin` during `vite build`, enabled when `CODECOV_TOKEN` is set | `deploy.yml` Production Build only           |

Local `pnpm run test:coverage` still writes `coverage/` (gitignored). Local
`pnpm run build` does **not** upload bundles unless you export `CODECOV_TOKEN`
in the shell — do not do that on a developer machine.

## Config

- Repo YAML: [`codecov.yml`](../codecov.yml) (coverage status, flags, components,
  PR comment layout including `bundle_analysis`, informational GitHub checks).
- Vitest reporters: `lcov` / `json` / `html` plus JUnit → `junit.xml`.
- Vite plugin is **last** in the `plugins` array (`vite.config.ts`), per Codecov.
- Bundle name: `ai-research-orchestrator`.
- Coverage include set matches the existing gate: `src/store`, `src/services`,
  `src/hooks`, `src/lib`. UI views stay on Playwright, not unit coverage.

## Merge policy

Codecov checks are **advisory**. Do **not** add them to the `mainrules` required
status list until `main` has a baseline upload. The blocking coverage gate remains
`pnpm run test:coverage` + `check:coverage-floors` in `deploy.yml`. The blocking
size gate remains `pnpm run bundle:budget`.

## First-run notes

1. After this lands on `main`, reload the Codecov repo dashboard if tabs are empty.
2. Subsequent PRs get a coverage / test / bundle comment once the GitHub App can
   see the `main` baseline.
3. If an upload 403s, confirm the org secret `CODECOV_TOKEN` is available to this
   repository (organization secrets → Actions).
