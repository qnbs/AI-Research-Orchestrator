import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type Dispatch,
  type SetStateAction,
} from 'react';
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
  type ReportStatus,
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
import { getAgentForPhaseId } from './getAgentForPhase';
import { stampReportWithProvenance } from '../lib/appReleaseInfo';
import {
  EXECUTION_PROVENANCE_PHASE,
  type ResearchExecutionContext,
} from '../lib/researchExecutionContext';
import type { PipelinePhaseId } from '../types/pipelineEvents';
import { PIPELINE_PHASE_LABEL, PIPELINE_TIMELINE_INDEX } from '../types/pipelineEvents';
import { safeLogError } from '../lib/safeLog';
import { computeReportSaveFingerprint } from '../lib/reportSaveFingerprint';

interface NotificationState {
  id: number;
  message: string;
  type: 'success' | 'error';
}

export interface UseResearchSessionArgs {
  aiSettings: Settings['ai'];
  autoSaveReports: boolean;
  setCurrentView: (view: View) => void;
  saveReport: (
    input: ResearchInput,
    report: ResearchReport,
    options?: { notifyOnError?: boolean },
  ) => Promise<void>;
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
  const [currentPhaseId, setCurrentPhaseId] = useState<PipelinePhaseId | null>(null);
  const [timelineIndex, setTimelineIndex] = useState(0);
  const [isCurrentReportSaved, setIsCurrentReportSaved] = useState(false);
  const [resumeCheckpoints, setResumeCheckpoints] = useState<ResearchCheckpoint[]>([]);

  const generationIdRef = useRef(0);
  const streamAbortRef = useRef<AbortController | null>(null);
  /** Matches the in-memory report snapshot last acknowledged as durably saved (KB). */
  const reportSaveFingerprintRef = useRef<string | null>(null);
  const reportRef = useRef(report);
  const localResearchInputRef = useRef(localResearchInput);

  useEffect(() => {
    reportRef.current = report;
  }, [report]);

  useEffect(() => {
    localResearchInputRef.current = localResearchInput;
  }, [localResearchInput]);

  const invalidateAcknowledgedSave = useCallback(() => {
    setIsCurrentReportSaved(false);
    reportSaveFingerprintRef.current = null;
  }, []);

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
      // Invalidate in-flight work *before* awaiting IndexedDB so a concurrent
      // search/navigation cannot be overwritten when this continuation resumes.
      generationIdRef.current += 1;
      const restoreGenId = generationIdRef.current;
      streamAbortRef.current?.abort();
      const ok = await guardedDeleteCheckpoint(ckpt.id);
      if (!ok) return;
      if (generationIdRef.current !== restoreGenId) return;

      setLocalResearchInput(ckpt.input);
      setReport(restored);
      // 'partial', never 'done' - reportFromCheckpoint always stamps
      // completionStatus: 'partial' since a restored checkpoint is missing
      // groundedSynthesis/provenance/corpusClass by construction.
      setReportStatus('partial');
      setError(ckpt.errorMessage ?? null);
      setCurrentPhase(ckpt.phase);
      setIsCurrentReportSaved(false);
      reportSaveFingerprintRef.current = null;
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
      reportSaveFingerprintRef.current = null;
      setCurrentPhase('');
      setCurrentPhaseId(null);
      setTimelineIndex(0);

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
      let frozenExecutionContext: ResearchExecutionContext | undefined;

      try {
        const stream = generateResearchReportStream(data, aiSettings, streamSignal);
        let isFirstChunk = true;

        for await (const {
          report: partialReport,
          synthesisChunk,
          phase,
          phaseId,
          promptBudget,
          executionContext,
        } of stream) {
          if (generationIdRef.current !== currentGenId) {
            streamAbortRef.current?.abort();
            return;
          }

          if (executionContext) {
            frozenExecutionContext = executionContext;
          }
          // Bootstrap provenance event — do not drive agent UI / phase chrome.
          if (phaseId === 'execution-provenance' || phase === EXECUTION_PROVENANCE_PHASE) {
            continue;
          }

          lastPhase = phase;
          setCurrentPhaseId(phaseId);
          // Keep producer phase text when it carries run-specific detail (ranking
          // counts, offline/partial status). Localize only the default label.
          const i18nKey = `orchestrator.pipeline.${phaseId}`;
          const localized = t(i18nKey);
          const defaultLabel = PIPELINE_PHASE_LABEL[phaseId];
          const usesDefaultLabel = phase === defaultLabel || phase.endsWith(` · ${defaultLabel}`);
          setCurrentPhase(usesDefaultLabel && localized !== i18nKey ? localized : phase);
          const nextTimeline = PIPELINE_TIMELINE_INDEX[phaseId];
          if (nextTimeline >= 0) {
            // Monotonic — status notices must not rewind past retrieval/curation.
            setTimelineIndex((prev) => Math.max(prev, nextTimeline));
          }

          // null = status/metadata phase — keep debugger message in sync on the
          // current agent row without inventing a new agent.
          const typedAgent = getAgentForPhaseId(phaseId);
          const agentForUpdate = typedAgent ?? prevAgent;
          if (agentForUpdate !== null) {
            if (typedAgent !== null && typedAgent !== prevAgent) {
              if (prevAgent !== null) {
                dispatch(setAgentStatus({ agentName: prevAgent, status: 'done' }));
              }
              dispatch(
                addTraceEvent({
                  agentName: typedAgent,
                  status: 'running',
                  message: phase,
                  phaseId,
                  startedAt: Date.now(),
                  metadata: promptBudget ? { promptBudget } : undefined,
                }),
              );
              prevAgent = typedAgent;
            } else {
              dispatch(
                setAgentStatus({
                  agentName: agentForUpdate,
                  status: 'running',
                  message: phase,
                  // Agentless status phases must not rewrite the row's phaseId.
                  ...(typedAgent !== null ? { phaseId } : {}),
                  // Always pass metadata so stale promptBudget does not linger.
                  metadata: promptBudget ? { promptBudget } : {},
                }),
              );
            }
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
            invalidateAcknowledgedSave();
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

        // Prefer streamed chunks; fall back to report.synthesis for report-only events.
        const synthesisText = finalSynthesis || finalReport.synthesis || '';
        // Stamp the frozen start-of-run context only — never re-resolve inference at completion
        // (online/key flips mid-run must not rewrite provenance; ADR 0017).
        // Educational demo is frozen as heuristic at stream start (ADR 0016).
        const completeReport = stampReportWithProvenance(
          { ...finalReport, synthesis: synthesisText },
          frozenExecutionContext
            ? { executionContext: frozenExecutionContext }
            : {
                // Defensive fallback only if the stream omitted the freeze event.
                inferenceMode: 'heuristic',
                providerId: 'heuristic',
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
        // Partial → final transitions (and any late grounded fields) must not keep a
        // prior fingerprint acknowledgement for an older snapshot (F-02).
        invalidateAcknowledgedSave();
        setReport(completeReport);
        // Keep ref in sync before the auto-save await — `useEffect` runs after commit,
        // so fingerprint checks would otherwise compare against a stale snapshot.
        reportRef.current = completeReport;
        setReportStatus('done');

        if (autoSaveReports) {
          try {
            const fpAtQueue = computeReportSaveFingerprint(data, completeReport);
            await saveReport(data, completeReport, { notifyOnError: false });
            // Await can let a newer run start (new search); only acknowledge save
            // for this generation (F-02).
            if (generationIdRef.current === currentGenId) {
              const fpNow = computeReportSaveFingerprint(data, reportRef.current ?? completeReport);
              if (fpAtQueue !== null && fpAtQueue === fpNow) {
                setIsCurrentReportSaved(true);
                reportSaveFingerprintRef.current = fpNow;
              }
            }
          } catch {
            if (generationIdRef.current !== currentGenId) return;
            setNotification({
              id: Date.now(),
              type: 'error',
              message: t('settings.kb.notification.save_failed'),
            });
          }
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
      invalidateAcknowledgedSave,
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
      const inputSnap = localResearchInput;
      const reportSnap = report;
      const fpAtStart = computeReportSaveFingerprint(inputSnap, reportSnap);
      if (!fpAtStart) return;
      try {
        await saveReport(inputSnap, reportSnap, { notifyOnError: false });
        const fpAfter = computeReportSaveFingerprint(
          localResearchInputRef.current,
          reportRef.current,
        );
        if (fpAfter === fpAtStart) {
          setIsCurrentReportSaved(true);
          reportSaveFingerprintRef.current = fpAfter;
          haptic('success');
        }
      } catch {
        setNotification({
          id: Date.now(),
          type: 'error',
          message: t('settings.kb.notification.save_failed'),
        });
        haptic('error');
      }
    }
  }, [report, localResearchInput, saveReport, haptic, setNotification, t]);

  /**
   * Cancels the in-flight stream without superseding it (generationIdRef is left
   * untouched) so the existing abort-handling path in handleFormSubmit's catch
   * block runs as usual: it persists a resumable checkpoint and surfaces a
   * "partial research saved" notification, exactly like the supersede-by-new-
   * search/new-report paths already do internally.
   */
  const handleCancelResearch = useCallback(() => {
    streamAbortRef.current?.abort();
  }, []);

  const handleNewSearch = useCallback(() => {
    generationIdRef.current += 1;
    streamAbortRef.current?.abort();
    setReport(null);
    setLocalResearchInput(null);
    setReportStatus('idle');
    setError(null);
    setIsCurrentReportSaved(false);
    reportSaveFingerprintRef.current = null;
    setCurrentPhase('');
    setCurrentPhaseId(null);
    setTimelineIndex(0);
    setCurrentView('orchestrator');
  }, [setCurrentView]);

  const openStoredResearchEntry = useCallback(
    (entry: Extract<KnowledgeBaseEntry, { sourceType: 'research' }>) => {
      generationIdRef.current += 1;
      streamAbortRef.current?.abort();
      setLocalResearchInput(entry.input);
      setReport(entry.report);
      // A report saved while still partial (Save is not blocked for partial
      // reports - it's a legitimate way to keep cancelled work) must reopen
      // as 'partial' too, not silently promoted to 'done'.
      setReportStatus(entry.report.completionStatus === 'partial' ? 'partial' : 'done');
      setError(null);
      setIsCurrentReportSaved(true);
      reportSaveFingerprintRef.current = computeReportSaveFingerprint(entry.input, entry.report);
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
      setIsCurrentReportSaved(false);
      reportSaveFingerprintRef.current = null;
    },
    [updateTags],
  );

  return {
    localResearchInput,
    setLocalResearchInput,
    report,
    setReport,
    reportStatus,
    error,
    currentPhase,
    currentPhaseId,
    timelineIndex,
    isCurrentReportSaved,
    resumeCheckpoints,
    setResumeCheckpoints: setResumeCheckpoints as Dispatch<SetStateAction<ResearchCheckpoint[]>>,
    handleDiscardCheckpoint,
    handleRestoreCheckpoint,
    handleFormSubmit,
    handleRerunCheckpoint,
    handleSaveReport,
    handleCancelResearch,
    handleNewSearch,
    openStoredResearchEntry,
    handleTagsUpdate,
  };
}
