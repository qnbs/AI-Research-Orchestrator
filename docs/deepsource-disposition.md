# DeepSource JavaScript — disposition log

Tracks **valid** findings fixed in-repo vs. intentional exclusions. Autofix PRs are consolidated here; do not merge `deepsource-autofix-*` branches directly.

## Fixed root causes (code)

| Rule     | Fix                                                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------ |
| JS-W1029 | Removed deprecated `getInstallPromptSnapshot()`; tests use `getInstallPromptStateSnapshot().event`     |
| JS-0038  | i18n cost preflight uses `{usd}` / `{tier}` placeholders + `t(key, values)`                            |
| JS-0437  | Stable React keys: insight `question`, cluster composite id, chart `entry.name`; skeleton lines skipcq |
| JS-0116  | Removed `async` from functions that only return an existing `Promise` (`apiKeyService` vault helpers)  |
| JS-0440  | `skipcq` on sanitized `dangerouslySetInnerHTML` in `AuthorProfileView`                                 |

## Excluded (false positives / out of scope)

| Rule              | Path                  | Reason                                                                    |
| ----------------- | --------------------- | ------------------------------------------------------------------------- |
| JS-0833           | `scripts/*.mjs`       | ESM maintenance scripts; excluded in `.deepsource.toml`                   |
| JS-0125 / JS-0067 | `public/sw.js`        | Service worker + Workbox globals; excluded                                |
| JS-0067           | TS `export function`  | ESM module exports; `dialect = typescript` + `module_system = es-modules` |
| JS-0757           | Modal `autoFocus`     | Intentional in focus-trapped modals (`eslint-disable` + a11y rationale)   |
| JS-R1005          | Large view components | Complexity tracked by ESLint + E2E; threshold `critical` only             |

## Autofix PR disposition (#148–#160)

| PR        | Disposition                                                                 |
| --------- | --------------------------------------------------------------------------- |
| #148–#156 | Consolidated in #146 or skipped (broken i18n/syntax/autofocus) — **closed** |
| #157      | Skipped — corrupts `parseGeminiJson.ts` — **closed**                        |
| #159      | Merged via root-cause branch — deprecated snapshot API                      |
| #160      | Partial — unnecessary `async` only; no `Promise.resolve` churn              |
