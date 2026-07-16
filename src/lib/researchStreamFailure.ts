import type { Dispatch, SetStateAction } from 'react';
import type { AgentName, ResearchInput, ResearchReport } from '../types';
import type { AppDispatch } from '../store/store';
import { completeTrace, setAgentStatus } from '../store/slices/agentDebugSlice';
import { saveResearchCheckpoint } from '../services/databaseService';
import { createResearchCheckpoint, isResumableCheckpoint } from './researchCheckpoint';
import { isAbortError, isAppError, toAppError } from './errors';

export type ResearchReportStatus = 'idle' | 'generating' | 'streaming' | 'done' | 'error';

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
  setReportStatus: (status: ResearchReportStatus) => void;
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
  const checkpoint = createResearchCheckpoint({
    input,
    phase,
    reason: aborted ? 'abort' : 'error',
    report: finalReport
      ? { ...finalReport, synthesis: finalSynthesis || finalReport.synthesis }
      : null,
    synthesisSoFar: finalSynthesis,
    errorMessage: aborted ? undefined : appErr.toUserMessage(),
  });

  if (isResumableCheckpoint(checkpoint)) {
    try {
      await persistCheckpoint(checkpoint);
      if (finalReport) {
        setReport({ ...finalReport, synthesis: finalSynthesis || finalReport.synthesis });
      }
      setNotification({
        id: Date.now(),
        type: aborted ? 'success' : 'error',
        message: aborted
          ? 'Partial research saved locally. You can review ranked articles already collected.'
          : `Research failed — partial results saved locally. ${appErr.toUserMessage()}`,
      });
    } catch (saveErr) {
      console.error('Failed to persist research checkpoint', saveErr);
      setNotification({
        id: Date.now(),
        type: 'error',
        message:
          'Research stopped, but partial results could not be saved locally. Please export or copy any visible results before leaving this page.',
      });
    }
  }

  if (aborted) {
    if (getActiveGenerationId() === currentGenerationId) {
      dispatch(completeTrace({ status: 'error' }));
      setReportStatus(finalReport ? 'done' : 'idle');
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
