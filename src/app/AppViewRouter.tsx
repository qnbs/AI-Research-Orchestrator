import React, { memo } from 'react';
import { FeatureErrorBoundary } from '../components/FeatureErrorBoundary';
import type { useAppLogic } from './useAppLogic';
import {
  KnowledgeBaseView,
  SettingsView,
  HelpView,
  DashboardView,
  HistoryView,
  ResearchView,
  AuthorsView,
  OrchestratorView,
  HomeView,
  JournalsView,
  CollectionsView,
} from './lazyViews';

type AppLogic = ReturnType<typeof useAppLogic>;

type AppViewRouterProps = Pick<
  AppLogic,
  | 'currentView'
  | 'reportStatus'
  | 'currentPhase'
  | 'currentPhaseId'
  | 'timelineIndex'
  | 'error'
  | 'report'
  | 'localResearchInput'
  | 'setLocalResearchInput'
  | 'isCurrentReportSaved'
  | 'settings'
  | 'prefilledTopic'
  | 'handleFormSubmit'
  | 'handleSaveReport'
  | 'handleCancelResearch'
  | 'handleNewSearch'
  | 'handlePrefillConsumed'
  | 'handleViewEntry'
  | 'handleStartNewReviewFromTopic'
  | 'handleTagsUpdate'
  | 'chatHistory'
  | 'isChatting'
  | 'sendMessage'
  | 'resumeCheckpoints'
  | 'handleRestoreCheckpoint'
  | 'handleRerunCheckpoint'
  | 'handleDiscardCheckpoint'
  | 'startResearch'
  | 'clearResearch'
  | 'isResearching'
  | 'researchPhase'
  | 'researchError'
  | 'researchAnalysis'
  | 'similar'
  | 'online'
  | 'selectedAuthorProfile'
  | 'handleAuthorProfileViewed'
  | 'kbFilter'
  | 'handleFilterChange'
  | 'handleViewChange'
  | 'selectedKbPmids'
  | 'setSelectedKbPmids'
  | 'handleAnalyzeJournalByName'
  | 'selectedJournalEntry'
  | 'handleJournalEntryViewed'
  | 'pendingJournalQuery'
  | 'handleJournalQueryConsumed'
  | 'handleClearKnowledgeBase'
  | 'settingsResetToken'
  | 'handleNavigateToHelp'
  | 'initialHelpTab'
  | 'setInitialHelpTab'
>;

/**
 * View switch for the app shell. Extracted from AppLayout to keep routing
 * complexity out of the chrome component.
 */
export function AppViewRouter(props: AppViewRouterProps): React.ReactElement {
  const {
    currentView,
    reportStatus,
    currentPhase,
    currentPhaseId,
    timelineIndex,
    error,
    report,
    localResearchInput,
    setLocalResearchInput,
    isCurrentReportSaved,
    settings,
    prefilledTopic,
    handleFormSubmit,
    handleSaveReport,
    handleCancelResearch,
    handleNewSearch,
    handlePrefillConsumed,
    handleViewEntry,
    handleStartNewReviewFromTopic,
    handleTagsUpdate,
    chatHistory,
    isChatting,
    sendMessage,
    resumeCheckpoints,
    handleRestoreCheckpoint,
    handleRerunCheckpoint,
    handleDiscardCheckpoint,
    startResearch,
    clearResearch,
    isResearching,
    researchPhase,
    researchError,
    researchAnalysis,
    similar,
    online,
    selectedAuthorProfile,
    handleAuthorProfileViewed,
    kbFilter,
    handleFilterChange,
    handleViewChange,
    selectedKbPmids,
    setSelectedKbPmids,
    handleAnalyzeJournalByName,
    selectedJournalEntry,
    handleJournalEntryViewed,
    pendingJournalQuery,
    handleJournalQueryConsumed,
    handleClearKnowledgeBase,
    settingsResetToken,
    handleNavigateToHelp,
    initialHelpTab,
    setInitialHelpTab,
  } = props;

  switch (currentView) {
    case 'home':
      return <HomeView onNavigate={handleViewChange} />;
    case 'orchestrator':
      return (
        <FeatureErrorBoundary featureNameKey="error.feature.name.orchestrator">
          <OrchestratorView
            reportStatus={reportStatus}
            currentPhase={currentPhase}
            currentPhaseId={currentPhaseId}
            timelineIndex={timelineIndex}
            error={error}
            report={report}
            researchInput={localResearchInput}
            isCurrentReportSaved={isCurrentReportSaved}
            settings={settings}
            prefilledTopic={prefilledTopic}
            handleFormSubmit={handleFormSubmit}
            handleSaveReport={handleSaveReport}
            handleCancelResearch={handleCancelResearch}
            handleNewSearch={handleNewSearch}
            onPrefillConsumed={handlePrefillConsumed}
            handleViewReportFromHistory={handleViewEntry}
            handleStartNewReview={handleStartNewReviewFromTopic}
            onUpdateResearchInput={setLocalResearchInput}
            handleTagsUpdate={handleTagsUpdate}
            chatHistory={chatHistory}
            isChatting={isChatting}
            onSendMessage={sendMessage}
            resumeCheckpoints={resumeCheckpoints}
            onRestoreCheckpoint={handleRestoreCheckpoint}
            onRerunCheckpoint={handleRerunCheckpoint}
            onDiscardCheckpoint={handleDiscardCheckpoint}
          />
        </FeatureErrorBoundary>
      );
    case 'research':
      return (
        <FeatureErrorBoundary featureNameKey="error.feature.name.research">
          <ResearchView
            onStartNewReview={handleStartNewReviewFromTopic}
            onStartResearch={startResearch}
            onClearResearch={clearResearch}
            isLoading={isResearching}
            phase={researchPhase}
            error={researchError}
            analysis={researchAnalysis}
            similarArticlesState={similar}
            onlineFindingsState={online}
          />
        </FeatureErrorBoundary>
      );
    case 'authors':
      return (
        <AuthorsView
          initialProfile={selectedAuthorProfile}
          onViewedInitialProfile={handleAuthorProfileViewed}
        />
      );
    case 'knowledgeBase':
      return (
        <FeatureErrorBoundary featureNameKey="error.feature.name.knowledgeBase">
          <KnowledgeBaseView
            onViewChange={handleViewChange}
            filter={kbFilter}
            onFilterChange={handleFilterChange}
            selectedPmids={selectedKbPmids}
            setSelectedPmids={setSelectedKbPmids}
            onAnalyzeJournal={handleAnalyzeJournalByName}
          />
        </FeatureErrorBoundary>
      );
    case 'journals':
      return (
        <JournalsView
          initialEntry={selectedJournalEntry}
          onViewedInitialEntry={handleJournalEntryViewed}
          onStartResearch={handleStartNewReviewFromTopic}
          initialQuery={pendingJournalQuery}
          onInitialQueryConsumed={handleJournalQueryConsumed}
        />
      );
    case 'collections':
      return <CollectionsView />;
    case 'dashboard':
      return <DashboardView onFilterChange={handleFilterChange} onViewChange={handleViewChange} />;
    case 'history':
      return <HistoryView onViewEntry={handleViewEntry} />;
    case 'settings':
      return (
        <SettingsView
          onClearKnowledgeBase={handleClearKnowledgeBase}
          resetToken={settingsResetToken}
          onNavigateToHelpTab={handleNavigateToHelp}
        />
      );
    case 'help':
      return <HelpView initialTab={initialHelpTab} onTabConsumed={() => setInitialHelpTab(null)} />;
    default:
      return <HomeView onNavigate={handleViewChange} />;
  }
}

export const MemoizedAppViewRouter = memo(AppViewRouter);
