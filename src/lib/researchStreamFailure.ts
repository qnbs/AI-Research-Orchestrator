import type { Dispatch, SetStateAction } from 'react';
import type { AgentName, ReportStatus, ResearchInput, ResearchReport } from '../types';
import type { AppDispatch } from '../store/store';
import { completeTrace, setAgentStatus } from '../store/slices/agentDebugSlice';
import { saveResearchCheckpoint } from '../services/databaseService';
import { createResearchCheckpoint, isResumableCheckpoint } from './researchCheckpoint';
import { isAbortError, isAppError, toAppError } from './errors';
import { safeLogError } from './safeLog';

export interface ResearchFailureNotification {
  id: number;
  message: string;
  type: 'success' | 'error';
}

export interface HandleResearchStreamFailureParams {
  error: unknown;
  currentGenerationId: number;
  getActiveGenerationId: () => number;
  input: ResearchInput;
  phase: string;
  finalReport: ResearchReport | null;
  finalSynthesis: string;
  previousAgent: AgentName | null;
  dispatch: AppDispatch;
  setReport: Dispatch<SetStateAction<ResearchReport | null>>;
  setReportStatus: (status: ReportStatus) => void;
  setError: (message: string | null) => void;
  setNotification: (notification: ResearchFailureNotification | null) => void;
  persistCheckpoint?: typeof saveResearchCheckpoint;
}

export async function handleResearchStreamFailure({
  error,
  currentGenerationId,
  getActiveGenerationId,
  input,
  phase,
  finalReport,
  finalSynthesis,
  previousAgent,
  dispatch,
  setReport,
  setReportStatus,
  setError,
  setNotification,
  persistCheckpoint = saveResearchCheckpoint,
}: HandleResearchStreamFailureParams): Promise<void> {
  if (getActiveGenerationId() !== currentGenerationId) {
    return;
  }

  const aborted = isAbortError(error);
  const appErr = toAppError(error, phase);
  const mergedSynthesis = finalSynthesis || (finalReport?.synthesis ?? '');
  // Stamped once so every place that surfaces this report (the optimistic
  // setReport below, and reportStatus itself) agrees it's incomplete. The
  // abort path skips the success path's finalization entirely (provenance
  // stamping, claim extraction, grounded-synthesis assessment at
  // useResearchSession.ts) - without this, a report cancelled mid-ranking or
  // mid-synthesis is otherwise indistinguishable from a genuinely finished
  // one once it's visible in the UI, save flow, or export.
  const partialReport: ResearchReport | null =
    aborted && finalReport
      ? {
          ...finalReport,
          synthesis: mergedSynthesis,
          completionStatus: 'partial',
          cancelledAtPhase: phase,
          cancelledAt: Date.now(),
        }
      : null;

  // Stamp the visible report now, synchronously - still safe without a
  // generation-id re-check since nothing async has happened yet since the
  // entry check above. Doing this before the checkpoint-persistence attempt
  // (rather than only inside its success branch) guarantees the cancellation
  // marker reaches the UI even if persistCheckpoint fails or the checkpoint
  // turns out non-resumable; previously a persistence failure left
  // reportStatus 'partial' while the report object itself stayed unstamped -
  // no banner, no export watermark, chat gate silently keyed off a value
  // that was never set.
  if (partialReport) {
    setReport(partialReport);
  }

  const checkpoint = createResearchCheckpoint({
    input,
    phase,
    reason: aborted ? 'abort' : 'error',
    report: finalReport ? { ...finalReport, synthesis: mergedSynthesis } : null,
    synthesisSoFar: finalSynthesis,
    errorMessage: aborted ? undefined : appErr.toUserMessage(),
  });

  if (isResumableCheckpoint(checkpoint)) {
    try {
      await persistCheckpoint(checkpoint);
      // Re-check after the async persist gap: a new run may have started (and
      // already set its own report/notification) while this one's checkpoint
      // write was still in flight - never let a stale run overwrite it.
      if (getActiveGenerationId() === currentGenerationId) {
        // partialReport was already set above (synchronously, pre-await) -
        // only the non-aborted "real error with a usable report" case still
        // needs a setReport call here.
        if (!partialReport && finalReport) {
          setReport({ ...finalReport, synthesis: mergedSynthesis });
        }
        setNotification({
          id: Date.now(),
          type: aborted ? 'success' : 'error',
          message: aborted
            ? 'Partial research saved locally. You can review ranked articles already collected.'
            : `Research failed — partial results saved locally. ${appErr.toUserMessage()}`,
        });
      }
    } catch (saveErr) {
      safeLogError('Failed to persist research checkpoint', saveErr);
      if (getActiveGenerationId() === currentGenerationId) {
        setNotification({
          id: Date.now(),
          type: 'error',
          message:
            'Research stopped, but partial results could not be saved locally. Please export or copy any visible results before leaving this page.',
        });
      }
    }
  }

  if (aborted) {
    if (getActiveGenerationId() === currentGenerationId) {
      dispatch(completeTrace({ status: 'error' }));
      // Never 'done' here - that status means the success path's
      // finalization actually ran. A cancelled run with a partial report is
      // 'partial' (still visible, clearly marked incomplete); with nothing
      // at all it's back to 'idle'.
      setReportStatus(partialReport ? 'partial' : 'idle');
    }
    return;
  }

  if (getActiveGenerationId() === currentGenerationId) {
    if (previousAgent !== null) {
      dispatch(setAgentStatus({ agentName: previousAgent, status: 'error' }));
    }
    dispatch(completeTrace({ status: 'error' }));
    setError(isAppError(error) ? error.toUserMessage() : appErr.toUserMessage());
    setReportStatus('error');
  }
}
