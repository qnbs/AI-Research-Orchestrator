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

| Invariant                           | Primary tests                                                                     |
| ----------------------------------- | --------------------------------------------------------------------------------- |
| Cancel + partial report ≠ `done`    | `useResearchSession.test.tsx`, `researchStreamFailure.test.ts`                    |
| Restore checkpoint = `partial`      | `useResearchSession.test.tsx`, `researchCheckpoint.test.ts`                       |
| Stale restore after new search      | `useResearchSession.test.tsx`                                                     |
| Stale stream after new search       | `useResearchSession.test.tsx` (`ignores stale stream completion…`)                |
| Cancel → checkpoint → restore       | `orchestrator-checkpoint.spec.ts`; partial banner/CSV in `agent-flow.spec.ts` §11 |
| Cancel → new search → reload banner | `orchestrator-checkpoint.spec.ts` (`new search after cancel…`)                    |
| Checkpoint payload partial stamp    | `researchCheckpoint.test.ts`                                                      |

## Out of scope (remaining on #419)

Provider mid-run switch, IndexedDB upgrade during stream, and exhaustive transition fuzzing — tracked with #403/#406.
