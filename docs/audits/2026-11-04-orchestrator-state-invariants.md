# Orchestrator state & report identity matrix — 2026-11-04

Workstream **WS-24** / **[#419](https://github.com/qnbs/AI-Research-Orchestrator/issues/419)**. Documents cross-component invariants already enforced in code and covered by automated tests (not a new semantic refactor).

## Report status (`ReportStatus`)

| From               | Event                              | To                  | Notes                                                   |
| ------------------ | ---------------------------------- | ------------------- | ------------------------------------------------------- |
| `idle`             | `handleFormSubmit`                 | `generating`        | Clears prior report; bumps `generationIdRef`            |
| `generating`       | first `report` chunk               | `streaming`         | Partial corpus visible                                  |
| `streaming`        | stream success                     | `done`              | Provenance + optional autosave                          |
| `*`                | stream error (no abort, no report) | `error`             | Trace error                                             |
| `*`                | abort w/ report                    | `partial`           | `completionStatus: 'partial'`, cancel provenance        |
| `*`                | abort w/o report                   | `idle`              | No checkpoint surface                                   |
| `idle`/`partial`/… | `handleRestoreCheckpoint`          | `partial`           | Never promotes restored checkpoint to `done`            |
| `*`                | `openStoredResearchEntry`          | `done` or `partial` | Mirrors stored `completionStatus`                       |
| `*`                | `handleNewSearch`                  | `idle`              | Supersedes generation; stale stream must not set `done` |

## Generation identity

- Every superseding action (`handleFormSubmit`, `handleNewSearch`, `openStoredResearchEntry`, successful restore preamble) increments `generationIdRef`.
- Stream loop and `handleResearchStreamFailure` no-op when `getActiveGenerationId() !== currentGenerationId` (prevents stale completion / duplicate checkpoints).

## Test coverage map

| Invariant                        | Primary tests                                                      |
| -------------------------------- | ------------------------------------------------------------------ |
| Cancel + partial report ≠ `done` | `useResearchSession.test.tsx`, `researchStreamFailure.test.ts`     |
| Restore checkpoint = `partial`   | `useResearchSession.test.tsx`, `researchCheckpoint.test.ts`        |
| Stale restore after new search   | `useResearchSession.test.tsx`                                      |
| Stale stream after new search    | `useResearchSession.test.tsx` (`ignores stale stream completion…`) |
| Reopen saved partial vs complete | `useResearchSession.test.tsx`                                      |
| Checkpoint payload partial stamp | `researchCheckpoint.test.ts`                                       |

## Out of scope (this pass)

Full browser journey for cancel/resume banner, provider mid-run switch, and IndexedDB upgrade during stream — tracked on #419 / related #403/#406; add Playwright only when a gap is reproduced outside unit coverage.
