# ADR 0021: Partial Report Completion State

## Status

Accepted — 2026-08-29

## Context

Cancelling a running research pipeline (Cancel/Stop, #231) with a partial report already
collected fell through `handleResearchStreamFailure` to `setReportStatus(finalReport ? 'done' :
'idle')`. A cancelled, incomplete report became indistinguishable from a normally completed one:
the abort path skips the success path's finalization entirely (provenance stamping in
`stampReportWithProvenance`, claim extraction via `extractGroundedClaimsFromMarkdown`, grounded-
synthesis assessment via `buildAssessedGroundedSynthesis`), yet both paths produced `'done'`.

Once shown as done, the report could be saved, exported, or opened in `useChat` as if fully
synthesized. An independent second instance existed in checkpoint restore
(`handleRestoreCheckpoint`), which reconstructs a report missing `groundedSynthesis` /
`generationProvenance` / `corpusClass` and also unconditionally set `'done'`.

This is a scientific-integrity defect: a truncated synthesis must never look like a finished
literature review after the transient cancellation toast clears.

## Decision

1. **Single `ReportStatus` in `src/types.ts`:**
   `'idle' | 'generating' | 'streaming' | 'partial' | 'done' | 'error'`.
   Callers import this union instead of duplicating it in session, stream-failure, orchestrator,
   chat, and chrome-effect files.
2. **`'partial'` is never `'done'`.** Abort with any report body stamps
   `reportStatus: 'partial'` (`researchStreamFailure.ts`). Empty abort returns `'idle'`.
   Non-abort failures stay `'error'`.
3. **The marker lives on `ResearchReport`:** optional `completionStatus?: 'partial'` plus
   `cancelledAtPhase` / `cancelledAt`, stamped at cancellation. Absence means normally completed.
   The fields survive Dexie `saveReport`, export sanitization, and KB reopen
   (`openStoredResearchEntry` reads `completionStatus` and does not heal to `'done'`).
4. **Checkpoint restore** (`reportFromCheckpoint` + `handleRestoreCheckpoint`) always reopens as
   `'partial'` — a restored checkpoint is missing success-path finalization by construction.
5. **Consumers:**
   - Orchestrator `showReport` includes `'partial'` so collected work stays visible.
   - `useChat` keeps `=== 'done'` as the only session-creation gate and tears down an existing
     session when status becomes `'partial'`.
   - `ReportDisplay` shows a non-dismissible banner; the chat accordion is replaced with copy, not
     a silent no-op send box. History list/quick-view show the same status.
   - `sanitizeReportForExport` prepends an idempotent
     `PARTIAL REPORT — RESEARCH DID NOT FINISH` watermark (generic — abort, restore, and reopen
     share `completionStatus: 'partial'`; do not assume every partial is a user cancel).
6. **EN + DE** strings live in `reportTranslations.ts` and `modalTranslations.ts`.

## Consequences

- A cancelled or restored run cannot match a completed one across UI, save, export, chat, or
  reopen.
- Future non-happy-path report states extend `ReportStatus` / `completionStatus` the same way.
- Callers that used `reportStatus === 'done'` as “safe to chat / treat as finished” needed no
  widening — `'partial'` is additive.

## References

- ADR 0016 (Synthetic Demo Quarantine)
- ADR 0017 (Immutable Execution Provenance)
- Implementation: #260 (successor of #234); Cancel control: #231
