# DeepSource JavaScript — disposition log

Tracks **valid** findings fixed in-repo vs. intentional exclusions. Autofix PRs are consolidated here; do not merge `deepsource-autofix-*` branches directly.

## Fixed root causes (code)

| Rule     | Fix                                                                                                             |
| -------- | --------------------------------------------------------------------------------------------------------------- |
| JS-W1029 | Removed deprecated `getInstallPromptSnapshot()`; tests use `getInstallPromptStateSnapshot().event`              |
| JS-0038  | i18n cost preflight uses `{usd}` / `{tier}` placeholders + `t(key, values)`                                     |
| JS-0437  | Stable React keys: JSON composite keys, `compareEnLocale`, pipe-collision test                                  |
| JS-0116  | Removed `async` from functions that only return an existing `Promise` (`apiKeyService` vault helpers)           |
| JS-0440  | `skipcq` on sanitized `dangerouslySetInnerHTML` in `AuthorProfileView`                                          |
| JS-0125  | `export const` arrow exports in `sourceIdentifier.ts`, `knowledgeBaseValidation.ts` + switch `default` branches |
| JS-0116  | `pubmedUtils.test.ts`: sync `Promise.resolve` mocks instead of needless `async` callbacks                       |

## Excluded (false positives / out of scope)

| Rule              | Path                   | Reason                                                                    |
| ----------------- | ---------------------- | ------------------------------------------------------------------------- |
| JS-0833           | `scripts/*.mjs`        | ESM maintenance scripts; excluded in `.deepsource.toml`                   |
| JS-0125 / JS-0067 | TS `export function`   | ESM exports misparsed as global scope — JavaScript analyzer **disabled**  |
| JS-R1005          | Complexity antipattern | Medium cyclomatic churn; ESLint + tests authoritative — analyzer disabled |
| JS-0125           | `scripts/lib/*.mjs`    | Module parse errors; use top-level `scripts/*.mjs` instead                |
| JS-0757           | Modal `autoFocus`      | Intentional in focus-trapped modals (`eslint-disable` + a11y rationale)   |

## GitHub check vs dashboard (2026-11-04, PR #407 head `8f4d665`)

| Context                  | Observation                                                                                                                                                                                                                                                                                                                            |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **GitHub commit status** | `DeepSource: Docker` + `DeepSource: Shell` **success**; **no** `DeepSource: JavaScript` context on the PR head (TOML has no JS analyzer block).                                                                                                                                                                                        |
| **Dashboard JavaScript** | When the dashboard analyzer is still enabled org-wide, the UI can show red JS findings on PR/`main` even though merge policy treats JS as advisory (`docs/deepsource-javascript-ci.md`, `docs/audit-governance.md`). Maintainer fix: disable JS under **Settings → Code Review → Analyzers** — see `docs/deepsource-dashboard-off.md`. |
| **AI Review**            | `@deepsourcebot review` attempts on #407; address actionable Docker/Shell + AI Review items in the correction loop.                                                                                                                                                                                                                    |

## Autofix PR disposition (#148–#160)

| PR        | Disposition                                                                 |
| --------- | --------------------------------------------------------------------------- |
| #148–#156 | Consolidated in #146 or skipped (broken i18n/syntax/autofocus) — **closed** |
| #157      | Skipped — corrupts `parseGeminiJson.ts` — **closed**                        |
| #159      | Merged via root-cause branch — deprecated snapshot API                      |
| #160      | Partial — unnecessary `async` only; no `Promise.resolve` churn              |
