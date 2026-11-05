# P1 audit wave disposition — 2026-11-04 (Europe/Berlin)

Canonical release: **`v0.4.7`** (2026-11-04) — audit-recovery wave after **v0.4.6**. Verify `git describe --tags` on `main` before closing issues.

## Issue ledger

| Issue                                                               | WS    | Disposition                                                                                                           | Evidence                                                            |
| ------------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| [#404](https://github.com/qnbs/AI-Research-Orchestrator/issues/404) | WS-10 | **Ready for maintainer close** — live About **`05e1c93`** matches `main` (probe 2026-11-05 08:34 CET)                 | `docs/audits/2026-11-04-github-pages-production-smoke.md`           |
| [#411](https://github.com/qnbs/AI-Research-Orchestrator/issues/411) | —     | **Ready for maintainer close** — README badge in `check:docs-drift` + **0.4.7** inventory (#451)                      | `docs/audits/2026-11-04-issue-closure-404-411.md`                   |
| [#408](https://github.com/qnbs/AI-Research-Orchestrator/issues/408) | —     | **Acceptance slice done** — Dexie + portable export + `collections.spec.ts`                                           | **v0.4.7** CHANGELOG                                                |
| [#409](https://github.com/qnbs/AI-Research-Orchestrator/issues/409) | —     | **Ready for maintainer close (dashboard slice)** — OA/source charts + E2E §5b (#438)                                  | `docs/audits/2026-11-05-issue-closure-409.md`                       |
| [#410](https://github.com/qnbs/AI-Research-Orchestrator/issues/410) | —     | **Ready for maintainer close (DeepSource slice)** — #439 TOML + verification doc                                      | `docs/audits/2026-11-05-issue-closure-410.md`                       |
| [#419](https://github.com/qnbs/AI-Research-Orchestrator/issues/419) | WS-24 | **Ready for maintainer close (in-scope slice)** — matrix + unit + checkpoint E2E (**#454**); out-of-scope: #403/#406  | `docs/audits/2026-11-04-orchestrator-state-invariants.md`, **#454** |
| [#421](https://github.com/qnbs/AI-Research-Orchestrator/issues/421) | WS-26 | **Ready for maintainer close (E2E slice)** — KB export/delete/reload/filter/pagination/virtualization (**#448–#455**) | `docs/audits/2026-11-04-issue-closure-419-421.md`                   |
| [#396](https://github.com/qnbs/AI-Research-Orchestrator/issues/396) | —     | **Ready for maintainer close** — brace-expansion fixed (#441); minimatch **deferred** with evidence (`4c75740`)       | `docs/audits/2026-11-05-minimatch-396-evidence.md`                  |

## Release notes

User-facing summary: **`CHANGELOG.md` [0.4.7]**. Tag **`v0.4.7`** after merge per `docs/release-policy.md`.

## Bot / merge policy

Dual gate (`docs/pr-merge-gate.md`) on every PR; CodeRabbit rate-limit **(d)** when documented.

## Maintainer batch index

All ready closes: **`docs/audits/2026-11-05-maintainer-close-pack-all.md`**.
