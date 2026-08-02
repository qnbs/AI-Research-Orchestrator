# Remediation Session Baseline — 2026-08-02 (10:10 UTC)

## Metadata

| Field                             | Value                                      |
| --------------------------------- | ------------------------------------------ |
| Initial audited baseline (prompt) | `e7e6a02ad1f62e863d29ce855675151cd11ba285` |
| Session `main` HEAD at start      | `e7e6a02` (identical to prompt baseline)   |
| Node / pnpm                       | v22.14.0 / 11.13.1                         |
| Open PR at start                  | #163 (draft audit master prompt)           |

## CI state on `main` at session start (commit `e7e6a02`)

| Workflow                | Event | Conclusion | Blocking                       |
| ----------------------- | ----- | ---------- | ------------------------------ |
| Deploy to GitHub Pages  | push  | success    | deploy only on `main`          |
| E2E Tests               | push  | success    | yes on PR                      |
| E2E Cross-Browser Smoke | push  | success    | advisory (`continue-on-error`) |
| A11y Smoke              | push  | success    | advisory                       |
| Security                | push  | success    | mixed                          |

Latest `main` push after DeepSource fixes: all above green on `fix(deepsource): root-cause fixes`.

## Local baseline gates (`main`, pre-change)

| Gate                                | Result                                                            |
| ----------------------------------- | ----------------------------------------------------------------- |
| `pnpm audit --audit-level=high`     | PASS                                                              |
| `pnpm run typecheck`                | PASS                                                              |
| `pnpm run lint`                     | PASS                                                              |
| `pnpm run format:check`             | PASS                                                              |
| `pnpm run i18n:ratchet`             | PASS                                                              |
| `pnpm run check:docs-drift`         | PASS                                                              |
| `pnpm run check:csp-endpoint-drift` | PASS                                                              |
| `pnpm run check:log-redaction`      | PASS                                                              |
| `pnpm run test:coverage`            | FAIL after SW branch — circular `apiSlice` import (fixed in #166) |

## Confirmed defects addressed this session

| ID                              | PR   | Status                                     |
| ------------------------------- | ---- | ------------------------------------------ |
| P0-4 PR #161 keys/currency      | #164 | **Fixed** — stable keys, `$ {usd}` marker  |
| P0-5 DeepSource docs drift      | #164 | **Fixed** — docs match enabled JS analyzer |
| P0-1 PubMed abstract/provenance | #166 | **Fixed** — EFetch + `abstractStatus`      |
| P0-2 SW NCBI key cache          | #165 | **Fixed** — NetworkOnly + activate purge   |

## Deferred (not started this session)

| ID                                   | Notes                                               |
| ------------------------------------ | --------------------------------------------------- |
| P0-3 Prompt budget / JSON truncation | `wrapUntrustedJsonBlock` still truncates at 12k     |
| P0-6 Synthesis trust model           | Partial infra exists; live UI still narrative-first |
| P1–P3 workstreams                    | Per master prompt                                   |

## PR stack

1. [#164](https://github.com/qnbs/AI-Research-Orchestrator/pull/164) `cursor/post-merge-stabilization-5bc0`
2. [#166](https://github.com/qnbs/AI-Research-Orchestrator/pull/166) `cursor/pubmed-abstract-provenance-5bc0`
3. [#165](https://github.com/qnbs/AI-Research-Orchestrator/pull/165) `cursor/sw-ncbi-cache-security-5bc0` (includes #166 commits)

## Residual risks

- Narrative synthesis trust (P0-6) unchanged.
- Prompt corpus truncation (P0-3) unchanged.
- Cross-browser E2E remains advisory; verify logs before promotion.
- DeepSource JavaScript advisory; ESLint/deploy gates authoritative.

## Maintainer re-verification

```bash
git fetch origin
pnpm install --frozen-lockfile
pnpm run typecheck && pnpm run lint && pnpm run test:coverage
pnpm run check:agent-eval && pnpm run build && pnpm run bundle:budget
# Read CI on PRs #164, #166, #165
```
