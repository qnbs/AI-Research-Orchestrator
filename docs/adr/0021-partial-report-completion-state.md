# ADR 0021: Partial Report Completion State

## Status

Accepted — 2026-08-06

## Context

Cancelling a running research pipeline (the Cancel/Stop control) with a partial report already
collected fell through `handleResearchStreamFailure` to `setReportStatus(finalReport ? 'done' :
'idle')`. A cancelled, incomplete report became indistinguishable from a normally completed one:
the abort path skips the success path's finalization entirely (provenance stamping in
`stampReportWithProvenance`, claim extraction via `extractGroundedClaimsFromMarkdown`, grounded-
synthesis assessment via `buildAssessedGroundedSynthesis`), yet both paths produced the same
`'done'` status. Once shown as done, the report could be saved to the Knowledge Base or exported
with no signal it was incomplete, and immediately became eligible for `useChat`'s report-grounded
AI chat session as if fully synthesized. An independent second instance of the same defect existed
in the checkpoint-restore flow (`handleRestoreCheckpoint`), which reconstructs a report missing
`groundedSynthesis`/`generationProvenance`/`corpusClass` by construction and also unconditionally
set `'done'`.

This is a scientific-integrity defect, not merely a UX rough edge: a partial, unverified,
possibly-truncated synthesis could be saved, exported, or chatted against as if it were a complete,
finalized research report — silently, with no persistent marker distinguishing it from genuine
completion once the transient cancellation notification cleared.

## Decision

1. **Single source of truth for lifecycle status**: `ReportStatus` (`src/types.ts`) —
   `'idle' | 'generating' | 'streaming' | 'partial' | 'done' | 'error'` — replacing three
   independently duplicated inline unions (`useResearchSession.ts`, `researchStreamFailure.ts`,
   `OrchestratorView.tsx`, `useChat.ts`, `useAppChromeEffects.ts`).
2. **`'partial'` is a distinct status from `'done'`**, never conflated. It is set whenever a
   report is shown that did not go through the success path's finalization: on abort with a
   partial result (`researchStreamFailure.ts`), on checkpoint restore (`handleRestoreCheckpoint`),
   and on reopening a Knowledge Base entry that was itself saved while partial
   (`openStoredResearchEntry`, which reads the persisted `completionStatus` rather than assuming
   `'done'`).
3. **The marker travels with the report object**, not just transient UI state: `ResearchReport`
   gains `completionStatus?: 'partial'` plus `cancelledAtPhase?: string` / `cancelledAt?: number`,
   stamped once at the point of cancellation/reconstruction. Because this lives on the report
   object itself (not a separate piece of state the caller must remember to thread through), it
   survives `saveReport` (persisted verbatim to Dexie), `sanitizeReportForExport` (PDF/JSON
   export), and reopening a saved entry — with zero additional plumbing in those call sites.
4. **Consumers react to the new status individually, by design, not via a single blanket gate**:
   - `OrchestratorView`'s `showReport` includes `'partial'` — the partial results stay visible
     (consistent with the existing checkpoint-resume feature's own premise that partial work is
     worth keeping), just clearly marked, not hidden.
   - `useChat`'s session-creation effect deliberately keeps its `=== 'done'` check unchanged —
     `'partial'` is automatically excluded once it is a distinct value. Chatting against data the
     model never finished ranking/synthesizing risks answers that look authoritative but aren't.
   - `ReportDisplay` renders a non-dismissable banner when `completionStatus === 'partial'`
     (naming the cancelled-at phase when known), and replaces the chat accordion's interactive
     `ChatInterface` with a short explanatory message instead of a chat box whose `sendMessage`
     would otherwise silently no-op (no session was ever created for a non-`'done'` report).
   - `sanitizeReportForExport` prepends a `PARTIAL REPORT — RESEARCH WAS CANCELLED BEFORE
COMPLETION` watermark to the exported synthesis text, mirroring the existing demo-corpus
     watermark pattern, in both the normal and empty-retrieval-early-return code paths.
5. **No new "complete" enum value.** `completionStatus` is optional with exactly one meaningful
   value (`'partial'`); absence means normally completed. This matches the existing convention on
   `ResearchReport` (`corpusClass`, `retrievalOutcome` are likewise optional, set only when
   something noteworthy applies) rather than introducing a required field every existing
   success-path write site would need to remember to set.

## Consequences

- A cancelled research run can never again look identical to a completed one across UI, save,
  export, chat-eligibility, or KB-reopen — the same object-level marker is authoritative
  everywhere it is checked.
- Adding a future non-happy-path report state (e.g. a distinct "failed mid-stream, no usable
  partial" case) follows the same pattern: extend `ReportStatus`/`completionStatus`, not invent a
  parallel signal.
- Callers that only ever checked `reportStatus === 'done'` for "is there a report to act on"
  needed no change — `'partial'` was additive, not a widening of an existing check's meaning.

## References

- ADR 0016 (Synthetic Demo Quarantine — same "never let an exceptional report look ordinary"
  principle, applied to demo/empty-retrieval corpora rather than cancellation)
- ADR 0017 (Immutable Execution Provenance — freezing provenance at a specific point in the
  pipeline, the same architectural move this ADR applies to completion state)
- `src/lib/researchStreamFailure.ts`, `src/lib/researchCheckpoint.ts`, `src/app/useResearchSession.ts`
