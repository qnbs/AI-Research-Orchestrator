import { useState, useCallback, useRef, type Dispatch, type SetStateAction } from 'react';
import { useAppDispatch } from '../store/hooks';
import {
  startNewTrace,
  addTraceEvent,
  setAgentStatus,
  completeTrace,
  setDebuggerVisible,
} from '../store/slices/agentDebugSlice';
import {
  ResearchInput,
  ResearchReport,
  KnowledgeBaseEntry,
  type AgentName,
  type Settings,
} from '../types';
import { generateResearchReportStream } from '../services/geminiService';
import { handleResearchStreamFailure } from '../lib/researchStreamFailure';
import { estimateResearchRunCost, shouldWarnAboutResearchCost } from '../lib/researchCostEstimate';
import { reportFromCheckpoint, type ResearchCheckpoint } from '../lib/researchCheckpoint';
import {
  extractGroundedClaimsFromMarkdown,
  buildAssessedGroundedSynthesis,
} from '../lib/groundedSynthesis';
import { deleteResearchCheckpoint } from '../services/databaseService';
import { toAppError } from '../lib/errors';
import type { View } from '../types/ui';
import type { TranslationKey } from '../i18n/translations';
import type { HapticPreset } from '../hooks/useHaptic';
import { getAgentForPhase } from './getAgentForPhase';
import { stampReportWithProvenance } from '../lib/appReleaseInfo';
import { resolveActiveInferenceMode } from '../services/resolveActiveInferenceMode';
import { safeLogError } from '../lib/safeLog';

type ReportStatus = 'idle' | 'generating' | 'streaming' | 'done' | 'error';

interface NotificationState {
  id: number;
  message: string;
  type: 'success' | 'error';
}

export interface UseResearchSessionArgs {
  aiSettings: Settings['ai'];
  autoSaveReports: boolean;
  setCurrentView: (view: View) => void;
  saveReport: (input: ResearchInput, report: ResearchReport) => Promise<void>;
  setNotification: (n: NotificationState | null) => void;
  t: (key: TranslationKey | (string & {}), values?: Record<string, string | number>) => string;
  haptic: (kind?: HapticPreset) => void;
  updateTags: (pmid: string, newTags: string[]) => Promise<void>;
  onCheckpointsChanged: () => void;
}

/**
 * Orchestrator research session: streaming generation, report state, and checkpoints.
 */
// skipcq: JS-0067 - standard ESM exported React hook
export function useResearchSession({
  aiSettings,
  autoSaveReports,
  setCurrentView,
  saveReport,
  setNotification,
  t,
  haptic,
  updateTags,
  onCheckpointsChanged,
}: UseResearchSessionArgs) {
  const dispatch = useAppDispatch();

  const [localResearchInput, setLocalResearchInput] = useState<ResearchInput | null>(null);
  const [report, setReport] = useState<ResearchReport | null>(null);
  const [reportStatus, setReportStatus] = useState<ReportStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [currentPhase, setCurrentPhase] = useState<string>('');
  const [isCurrentReportSaved, setIsCurrentReportSaved] = useState(false);
  const [resumeCheckpoints, setResumeCheckpoints] = useState<ResearchCheckpoint[]>([]);

  const generationIdRef = useRef(0);
  const streamAbortRef = useRef<AbortController | null>(null);

  const notifyCheckpointDeleteFailure = useCallback(
    (err: unknown) => {
      const appErr = toAppError(err, 'checkpoint_delete');
      setNotification({
        id: Date.now(),
        type: 'error',
        message: appErr.toUserMessage(),
      });
    },
    [setNotification],
  );

  const guardedDeleteCheckpoint = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await deleteResearchCheckpoint(id);
        return true;
      } catch (err) {
        safeLogError('Failed to delete research checkpoint', err);
        notifyCheckpointDeleteFailure(err);
        return false;
      }
    },
    [notifyCheckpointDeleteFailure],
  );

  const handleDiscardCheckpoint = useCallback(
    async (id: string) => {
      const ok = await guardedDeleteCheckpoint(id);
      if (!ok) return;
      setResumeCheckpoints((prev) => prev.filter((c) => c.id !== id));
      setNotification({
        id: Date.now(),
        type: 'success',
        message: t('checkpoint.discarded'),
      });
    },
    [guardedDeleteCheckpoint, setNotification, t],
  );

  const handleRestoreCheckpoint = useCallback(
    async (ckpt: ResearchCheckpoint) => {
      const restored = reportFromCheckpoint(ckpt);
      if (!restored) return;
      const ok = await guardedDeleteCheckpoint(ckpt.id);
      if (!ok) return;

      generationIdRef.current += 1;
      streamAbortRef.current?.abort();
      setLocalResearchInput(ckpt.input);
      setReport(restored);
      setReportStatus('done');
      setError(ckpt.errorMessage ?? null);
      setCurrentPhase(ckpt.phase);
      setIsCurrentReportSaved(false);
      setCurrentView('orchestrator');
      setResumeCheckpoints((prev) => prev.filter((c) => c.id !== ckpt.id));
      setNotification({
        id: Date.now(),
        type: 'success',
        message: t('checkpoint.restored'),
      });
    },
    [guardedDeleteCheckpoint, setCurrentView, setNotification, t],
  );

  const handleFormSubmit = useCallback(
    async (data: ResearchInput) => {
      generationIdRef.current += 1;
      const currentGenId = generationIdRef.current;

      setReportStatus('generating');
      setError(null);
      setReport(null);
      setLocalResearchInput(data);
      setCurrentView('orchestrator');
      setIsCurrentReportSaved(false);

      const costEstimate = estimateResearchRunCost({
        provider: aiSettings.provider ?? 'gemini',
        model: aiSettings.model,
        topic: data.researchTopic,
        maxArticlesToScan: data.maxArticlesToScan,
        topNToSynthesize: data.topNToSynthesize,
      });
      if (shouldWarnAboutResearchCost(costEstimate)) {
        const msg = t('orchestrator.cost_preflight', {
          usd: costEstimate.estimatedUsd?.toFixed(3) ?? '0',
          provider: costEstimate.providerLabel,
          tier: costEstimate.pricingTierLabel,
        });
        setNotification({
          id: Date.now(),
          type: 'success',
          message: msg,
        });
      }

      const sessionId = `sess_${currentGenId}_${Date.now()}`;
      dispatch(startNewTrace({ sessionId, topic: data.researchTopic }));
      dispatch(setDebuggerVisible(true));
      let prevAgent: AgentName | null = null;

      streamAbortRef.current?.abort();
      streamAbortRef.current = new AbortController();
      const streamSignal = streamAbortRef.current.signal;

      let finalSynthesis = '';
      let finalReport: ResearchReport | null = null;
      let lastPhase = 'Initializing...';

      try {
        const stream = generateResearchReportStream(data, aiSettings, streamSignal);
        let isFirstChunk = true;

        for await (const { report: partialReport, synthesisChunk, phase, promptBudget } of stream) {
          if (generationIdRef.current !== currentGenId) {
            streamAbortRef.current?.abort();
            return;
          }

          lastPhase = phase;
          setCurrentPhase(phase);

          const currentAgent = getAgentForPhase(phase);
          if (currentAgent !== prevAgent) {
            if (prevAgent !== null) {
              dispatch(setAgentStatus({ agentName: prevAgent, status: 'done' }));
            }
            dispatch(
              addTraceEvent({
                agentName: currentAgent,
                status: 'running',
                message: phase,
                startedAt: Date.now(),
                metadata: promptBudget ? { promptBudget } : undefined,
              }),
            );
            prevAgent = currentAgent;
          } else {
            dispatch(
              setAgentStatus({ agentName: currentAgent, status: 'running', message: phase }),
            );
          }

          if (partialReport) {
            finalReport = partialReport;
            if (isFirstChunk) {
              setReport(finalReport);
              setReportStatus('streaming');
              isFirstChunk = false;
            }
          }

          // Accumulate chunks only — never seed from report.synthesis mid-stream
          // (Non-AI emits full synthesis on the report and again as chunks).
          if (synthesisChunk) {
            finalSynthesis += synthesisChunk;
            setReport((prev) => (prev ? { ...prev, synthesis: finalSynthesis } : null));
          }
        }

        if (generationIdRef.current !== currentGenId) return;

        if (!finalReport) {
          if (prevAgent !== null) {
            dispatch(setAgentStatus({ agentName: prevAgent, status: 'error' }));
          }
          dispatch(completeTrace({ status: 'error' }));
          setError(t('orchestrator.emptyStream'));
          setReportStatus('error');
          return;
        }

        if (prevAgent !== null) {
          dispatch(setAgentStatus({ agentName: prevAgent, status: 'done' }));
        }
        dispatch(completeTrace({ status: 'done' }));

        // Educational demo always executed via Non-AI — never stamp as live provider.
        const educationalDemoRun =
          Boolean(data.educationalDemoMode) ||
          finalReport.corpusClass === 'demo-only' ||
          finalReport.retrievalOutcome === 'educational_demo';
        const modeSnapshot = educationalDemoRun
          ? {
              mode: 'heuristic' as const,
              reason: 'force' as const,
              hasApiKey: true,
              isOnline: true,
              forceHeuristic: true,
              provider: 'heuristic' as const,
            }
          : await resolveActiveInferenceMode({
              forceHeuristic: Boolean(aiSettings.forceHeuristicMode),
              provider: aiSettings.provider ?? 'gemini',
            });
        const executedProviderId =
          modeSnapshot.mode === 'heuristic' ? 'heuristic' : (aiSettings.provider ?? 'gemini');

        // Prefer streamed chunks; fall back to report.synthesis for report-only events.
        const synthesisText = finalSynthesis || finalReport.synthesis || '';
        const completeReport = stampReportWithProvenance(
          { ...finalReport, synthesis: synthesisText },
          {
            inferenceMode: modeSnapshot.mode,
            providerId: executedProviderId,
            model: aiSettings.model,
          },
        );
        const corpusPmids = completeReport.rankedArticles.map((a) => a.pmid);
        const extractedClaims = extractGroundedClaimsFromMarkdown(synthesisText, corpusPmids);
        if (extractedClaims.length > 0) {
          completeReport.groundedSynthesis = buildAssessedGroundedSynthesis(
            extractedClaims,
            completeReport.rankedArticles,
            'narrative-extracted',
          );
        }
        setReport(completeReport);
        setReportStatus('done');

        if (autoSaveReports) {
          await saveReport(data, completeReport);
          setIsCurrentReportSaved(true);
        }
      } catch (err) {
        await handleResearchStreamFailure({
          error: err,
          currentGenerationId: currentGenId,
          getActiveGenerationId: () => generationIdRef.current,
          input: data,
          phase: lastPhase,
          finalReport,
          finalSynthesis,
          previousAgent: prevAgent,
          dispatch,
          setReport,
          setReportStatus,
          setError,
          setNotification,
        });
        onCheckpointsChanged();
      }
    },
    [
      dispatch,
      aiSettings,
      autoSaveReports,
      setCurrentView,
      saveReport,
      setNotification,
      t,
      onCheckpointsChanged,
    ],
  );

  const handleRerunCheckpoint = useCallback(
    async (ckpt: ResearchCheckpoint) => {
      const ok = await guardedDeleteCheckpoint(ckpt.id);
      if (!ok) return;
      setResumeCheckpoints((prev) => prev.filter((c) => c.id !== ckpt.id));
      await handleFormSubmit(ckpt.input);
    },
    [guardedDeleteCheckpoint, handleFormSubmit],
  );

  const handleSaveReport = useCallback(async () => {
    if (report && localResearchInput) {
      await saveReport(localResearchInput, report);
      setIsCurrentReportSaved(true);
      haptic('success');
    }
  }, [report, localResearchInput, saveReport, haptic]);

  const handleNewSearch = useCallback(() => {
    generationIdRef.current += 1;
    streamAbortRef.current?.abort();
    setReport(null);
    setLocalResearchInput(null);
    setReportStatus('idle');
    setError(null);
    setIsCurrentReportSaved(false);
    setCurrentView('orchestrator');
  }, [setCurrentView]);

  const openStoredResearchEntry = useCallback(
    (entry: Extract<KnowledgeBaseEntry, { sourceType: 'research' }>) => {
      generationIdRef.current += 1;
      streamAbortRef.current?.abort();
      setLocalResearchInput(entry.input);
      setReport(entry.report);
      setReportStatus('done');
      setError(null);
      setIsCurrentReportSaved(true);
      setCurrentView('orchestrator');
    },
    [setCurrentView],
  );

  const handleTagsUpdate = useCallback(
    async (pmid: string, newTags: string[]) => {
      await updateTags(pmid, newTags);
      setReport((prevReport) => {
        if (!prevReport || !prevReport.rankedArticles.some((a) => a.pmid === pmid)) {
          return prevReport;
        }
        return {
          ...prevReport,
          rankedArticles: prevReport.rankedArticles.map((a) =>
            a.pmid === pmid ? { ...a, customTags: newTags } : a,
          ),
        };
      });
    },
    [updateTags],
  );

  return {
    localResearchInput,
    setLocalResearchInput,
    report,
    reportStatus,
    error,
    currentPhase,
    isCurrentReportSaved,
    resumeCheckpoints,
    setResumeCheckpoints: setResumeCheckpoints as Dispatch<SetStateAction<ResearchCheckpoint[]>>,
    handleDiscardCheckpoint,
    handleRestoreCheckpoint,
    handleFormSubmit,
    handleRerunCheckpoint,
    handleSaveReport,
    handleNewSearch,
    openStoredResearchEntry,
    handleTagsUpdate,
  };
}
