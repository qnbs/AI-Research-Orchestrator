import React, { memo, useCallback, useState } from 'react';
import { InputForm } from './InputForm';
import { ReportDisplay } from './ReportDisplay';
import { LoadingIndicator } from './LoadingIndicator';
import { OrchestratorDashboard } from './OrchestratorDashboard';
import { Welcome } from './Welcome';
import { CheckpointResumeBanner } from './CheckpointResumeBanner';
import { ResearchBriefSummary } from './ResearchBriefSummary';
import {
  ResearchInput,
  ResearchReport,
  KnowledgeBaseEntry,
  Settings,
  ChatMessage,
  type ReportStatus,
} from '../types';
import type { ResearchCheckpoint } from '../lib/researchCheckpoint';
import { useKnowledgeBase } from '../contexts/KnowledgeBaseContext';
import { useTranslation } from '../hooks/useTranslation';
import { XIcon } from './icons/XIcon';
import { shouldShowComposeForm, shouldShowResearchBrief } from '../lib/orchestratorTaskPhase';

interface OrchestratorViewProps {
  reportStatus: ReportStatus;
  currentPhase: string;
  /** Stable timeline index from typed pipeline phaseId (ADR 0020). */
  timelineIndex?: number;
  currentPhaseId?: string | null;
  error: string | null;
  report: ResearchReport | null;
  researchInput: ResearchInput | null;
  isCurrentReportSaved: boolean;
  settings: Settings;
  prefilledTopic: string | null;
  handleFormSubmit: (data: ResearchInput) => void;
  handleSaveReport: () => void;
  handleCancelResearch: () => void;
  handleNewSearch: () => void;
  onPrefillConsumed: () => void;
  handleViewReportFromHistory: (entry: KnowledgeBaseEntry) => void;
  handleStartNewReview: (topic: string) => void;
  onUpdateResearchInput: (newInput: ResearchInput) => void;
  handleTagsUpdate: (pmid: string, newTags: string[]) => void;
  chatHistory: ChatMessage[];
  isChatting: boolean;
  onSendMessage: (message: string) => void;
  resumeCheckpoints: ResearchCheckpoint[];
  onRestoreCheckpoint: (checkpoint: ResearchCheckpoint) => void;
  onRerunCheckpoint: (checkpoint: ResearchCheckpoint) => void;
  onDiscardCheckpoint: (id: string) => void;
}

function orchestratorSubphaseLines(
  t: ReturnType<typeof useTranslation>['t'],
  stem: string,
  count: number,
): string[] {
  return Array.from({ length: count }, (_, index) =>
    t(`orchestrator.subphase.${stem}.${index + 1}` as Parameters<typeof t>[0]),
  );
}

const OrchestratorViewComponent: React.FC<OrchestratorViewProps> = ({
  reportStatus,
  currentPhase,
  timelineIndex,
  currentPhaseId,
  error,
  report,
  researchInput,
  isCurrentReportSaved,
  settings,
  prefilledTopic,
  handleFormSubmit,
  handleSaveReport,
  handleCancelResearch,
  handleNewSearch,
  onPrefillConsumed,
  handleViewReportFromHistory,
  handleStartNewReview,
  onUpdateResearchInput,
  handleTagsUpdate,
  chatHistory,
  isChatting,
  onSendMessage,
  resumeCheckpoints,
  onRestoreCheckpoint,
  onRerunCheckpoint,
  onDiscardCheckpoint,
}) => {
  const { knowledgeBase } = useKnowledgeBase();
  const { t } = useTranslation();
  const [editingBrief, setEditingBrief] = useState(false);

  const loadingPhases = [
    t('orchestrator.phase1'),
    t('orchestrator.phase2'),
    t('orchestrator.phase3'),
    t('orchestrator.phase4'),
    t('orchestrator.phase5'),
    t('orchestrator.phase6'),
    t('orchestrator.phase7'),
  ];

  const phaseDetailsById: Record<string, string[]> = {
    'query-generation': orchestratorSubphaseLines(t, 'query_generation', 3),
    'pubmed-search': orchestratorSubphaseLines(t, 'pubmed_search', 3),
    'pubmed-fetch': orchestratorSubphaseLines(t, 'pubmed_fetch', 3),
    curation: orchestratorSubphaseLines(t, 'curation', 3),
    'arxiv-fetch': orchestratorSubphaseLines(t, 'arxiv_fetch', 2),
    ranking: orchestratorSubphaseLines(t, 'ranking', 3),
    synthesis: orchestratorSubphaseLines(t, 'synthesis', 3),
    'synthesis-stream': orchestratorSubphaseLines(t, 'synthesis_stream', 2),
    finalizing: orchestratorSubphaseLines(t, 'finalizing', 2),
    retrieval: [
      t('orchestrator.subphase.retrieval.1'),
      t('orchestrator.subphase.retrieval.2'),
      t('orchestrator.subphase.retrieval.3'),
    ],
    'demo-corpus': [
      t('orchestrator.subphase.demo_corpus.1'),
      t('orchestrator.subphase.demo_corpus.2'),
    ],
    'retrieval-status': [
      t('orchestrator.subphase.retrieval_status.1'),
      t('orchestrator.subphase.retrieval_status.2'),
    ],
    'empty-retrieval': [
      t('orchestrator.subphase.empty_retrieval.1'),
      t('orchestrator.subphase.empty_retrieval.2'),
    ],
  };

  const isProcessing = reportStatus === 'generating' || reportStatus === 'streaming';
  const showLoadingIndicator = reportStatus === 'generating';
  const showReport =
    (reportStatus === 'streaming' || reportStatus === 'done' || reportStatus === 'partial') &&
    report;
  const showResumeBanner = !isProcessing && resumeCheckpoints.length > 0;
  const hasReport = Boolean(showReport);
  const showBrief = shouldShowResearchBrief({
    researchTopic: researchInput?.researchTopic,
    reportStatus,
    hasReport,
    editingBrief,
  });
  const showComposeForm = shouldShowComposeForm({
    showBrief,
    editingBrief,
    reportStatus,
    hasReport: Boolean(report),
  });

  const onFormSubmit = useCallback(
    (data: ResearchInput) => {
      setEditingBrief(false);
      handleFormSubmit(data);
    },
    [handleFormSubmit],
  );

  const onNewSearchFromBrief = useCallback(() => {
    setEditingBrief(false);
    handleNewSearch();
  }, [handleNewSearch]);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {showComposeForm && (
        <InputForm
          onSubmit={onFormSubmit}
          isLoading={isProcessing}
          defaultSettings={settings.defaults}
          prefilledTopic={prefilledTopic}
          onPrefillConsumed={onPrefillConsumed}
          seedInput={editingBrief && researchInput ? researchInput : null}
          onCancelEdit={editingBrief ? () => setEditingBrief(false) : undefined}
        />
      )}

      {showBrief && researchInput && (
        <ResearchBriefSummary
          input={researchInput}
          reportStatus={reportStatus}
          hasReport={hasReport}
          isSaved={isCurrentReportSaved}
          isProcessing={isProcessing}
          onEdit={() => setEditingBrief(true)}
          onNewSearch={onNewSearchFromBrief}
        />
      )}

      {showResumeBanner && (
        <CheckpointResumeBanner
          checkpoints={resumeCheckpoints}
          onRestore={onRestoreCheckpoint}
          onRerun={onRerunCheckpoint}
          onDiscard={onDiscardCheckpoint}
        />
      )}

      {isProcessing && !showLoadingIndicator && (
        // After the first partial report, LoadingIndicator unmounts and ReportDisplay
        // takes over, but the stream is still active until 'done'. Keep cancel here.
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleCancelResearch}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md text-text-primary bg-surface border border-border hover:bg-surface-hover focus-ring-aa touch-target-aa"
          >
            <XIcon className="h-4 w-4" />
            {t('orchestrator.cancel.button')}
          </button>
        </div>
      )}

      {showLoadingIndicator && (
        <LoadingIndicator
          title={t('orchestrator.title')}
          phase={currentPhase}
          phaseId={currentPhaseId ?? undefined}
          phases={loadingPhases}
          phaseDetails={phaseDetailsById}
          timelineIndex={timelineIndex}
          footerText={t('orchestrator.loading.footer')}
          cancel={{ label: t('orchestrator.cancel.button'), onClick: handleCancelResearch }}
        />
      )}

      {error && (
        <div className="text-center text-red-400 font-semibold p-8 bg-surface rounded-lg border border-red-500/20">
          {error}
        </div>
      )}

      {showReport && researchInput && (
        <ReportDisplay
          report={report}
          input={researchInput}
          isSaved={isCurrentReportSaved}
          onSave={handleSaveReport}
          onNewSearch={handleNewSearch}
          onUpdateInput={onUpdateResearchInput}
          onTagsUpdate={handleTagsUpdate}
          chatHistory={chatHistory}
          isChatting={isChatting}
          onSendMessage={onSendMessage}
          chatEnabled={reportStatus === 'done'}
        />
      )}

      {!isProcessing &&
        !error &&
        !report &&
        (knowledgeBase.length > 0 ? (
          <OrchestratorDashboard
            onViewReport={handleViewReportFromHistory}
            onStartNewReview={handleStartNewReview}
          />
        ) : (
          <Welcome onFocusTopic={() => document.getElementById('researchTopic')?.focus()} />
        ))}
    </div>
  );
};

export default memo(OrchestratorViewComponent);
