import React, { Suspense, memo } from 'react';
import { Header } from '../components/Header';
import { OfflineBanner } from '../components/OfflineBanner';
import { UpdateAvailableBanner } from '../components/UpdateAvailableBanner';
import { DemoDataBanner } from '../components/DemoDataBanner';
import { Notification } from '../components/Notification';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { BottomNavBar } from '../components/BottomNavBar';
import { FeatureErrorBoundary } from '../components/FeatureErrorBoundary';
import { ContentSpinner, FullScreenSpinner } from './AppSpinners';
import { useAppLogic } from './useAppLogic';
import {
  OnboardingView,
  KnowledgeBaseView,
  SettingsView,
  HelpView,
  DashboardView,
  HistoryView,
  ResearchView,
  AuthorsView,
  OrchestratorView,
  HomeView,
  CommandPalette,
  QuickAddModal,
  JournalsView,
  CollectionsView,
  AgentDebugger,
} from './lazyViews';

/**
 * App shell: banners, chrome, and view routing.
 * State/effects/handlers live in useAppLogic (pure structural split from App.tsx).
 */
const AppLayout: React.FC = () => {
  const {
    isLoading,
    isSettingsLoading,
    arePresetsLoading,
    settings,
    localResearchInput,
    setLocalResearchInput,
    report,
    reportStatus,
    error,
    currentPhase,
    selectedAuthorProfile,
    selectedJournalEntry,
    pendingJournalQuery,
    currentView,
    notification,
    setNotification,
    pendingNavigation,
    setPendingNavigation,
    isCommandPaletteOpen,
    knowledgeBase,
    uniqueArticles,
    isCurrentReportSaved,
    selectedKbPmids,
    setSelectedKbPmids,
    showExportModal,
    setShowExportModal,
    isQuickAddModalOpen,
    setIsQuickAddModalOpen,
    resumeCheckpoints,
    chatHistory,
    isChatting,
    sendMessage,
    isResearching,
    researchPhase,
    researchError,
    researchAnalysis,
    similar,
    online,
    startResearch,
    clearResearch,
    settingsResetToken,
    initialHelpTab,
    setInitialHelpTab,
    prefilledTopic,
    kbFilter,
    handleDiscardCheckpoint,
    handleRestoreCheckpoint,
    handleFormSubmit,
    handleRerunCheckpoint,
    handleSaveReport,
    handleNewSearch,
    handleClearKnowledgeBase,
    handleViewChange,
    handleConfirmNavigation,
    handleCompleteOnboarding,
    handleFilterChange,
    handlePrefillConsumed,
    handleStartNewReviewFromTopic,
    handleViewEntry,
    handleAuthorProfileViewed,
    handleJournalEntryViewed,
    handleAnalyzeJournalByName,
    handleJournalQueryConsumed,
    handleTagsUpdate,
    handleExportSelection,
    handleConfirmExport,
    handleNavigateToHelp,
  } = useAppLogic();

  if (isSettingsLoading || isLoading || arePresetsLoading) {
    return <FullScreenSpinner />;
  }

  if (!settings.hasCompletedOnboarding) {
    return (
      <Suspense fallback={<FullScreenSpinner />}>
        <OnboardingView onComplete={handleCompleteOnboarding} />
      </Suspense>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <HomeView onNavigate={handleViewChange} />;
      case 'orchestrator':
        return (
          <FeatureErrorBoundary featureName="Research Orchestrator">
            <OrchestratorView
              reportStatus={reportStatus}
              currentPhase={currentPhase}
              error={error}
              report={report}
              researchInput={localResearchInput}
              isCurrentReportSaved={isCurrentReportSaved}
              settings={settings}
              prefilledTopic={prefilledTopic}
              handleFormSubmit={handleFormSubmit}
              handleSaveReport={handleSaveReport}
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
          <FeatureErrorBoundary featureName="Research Assistant">
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
          <FeatureErrorBoundary featureName="Knowledge Base">
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
        return (
          <DashboardView onFilterChange={handleFilterChange} onViewChange={handleViewChange} />
        );
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
        return (
          <HelpView initialTab={initialHelpTab} onTabConsumed={() => setInitialHelpTab(null)} />
        );
      default:
        return <HomeView onNavigate={handleViewChange} />;
    }
  };

  return (
    <>
      <Header
        onViewChange={handleViewChange}
        currentView={currentView}
        knowledgeBaseArticleCount={uniqueArticles.length}
        hasReports={knowledgeBase.length > 0}
        isResearching={isResearching}
        onQuickAdd={() => setIsQuickAddModalOpen(true)}
      />
      <OfflineBanner />
      <DemoDataBanner />
      <UpdateAvailableBanner />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 md:pt-36 pt-20 pb-24">
        <Suspense fallback={<ContentSpinner />}>{renderView()}</Suspense>
      </main>
      <BottomNavBar
        currentView={currentView}
        onViewChange={handleViewChange}
        knowledgeBaseArticleCount={uniqueArticles.length}
        hasReports={knowledgeBase.length > 0}
        isResearching={isResearching}
      />
      {notification && (
        <Notification
          {...notification}
          onClose={() => setNotification(null)}
          position={settings.notifications.position}
          duration={settings.notifications.duration}
        />
      )}
      {pendingNavigation && (
        <ConfirmationModal
          onConfirm={handleConfirmNavigation}
          onCancel={() => setPendingNavigation(null)}
          title="Discard Unsaved Changes?"
          message="You have unsaved changes in Settings. Are you sure you want to discard them and navigate away?"
          confirmText="Yes, Discard Changes"
        />
      )}
      {showExportModal && ['pdf', 'csv', 'bib', 'ris'].includes(showExportModal) && (
        <ConfirmationModal
          onConfirm={handleConfirmExport}
          onCancel={() => setShowExportModal(null)}
          title={`Export ${selectedKbPmids.length} Articles`}
          message={`Are you sure you want to export citations for the ${selectedKbPmids.length} selected articles as a ${showExportModal.toUpperCase()} file?`}
          confirmText="Yes, Export"
        />
      )}

      <Suspense>
        {isCommandPaletteOpen && (
          <CommandPalette
            isReportVisible={!!report}
            isCurrentReportSaved={isCurrentReportSaved}
            selectedArticleCount={selectedKbPmids.length}
            onSaveReport={handleSaveReport}
            onExportSelection={handleExportSelection}
          />
        )}
        {isQuickAddModalOpen && <QuickAddModal onClose={() => setIsQuickAddModalOpen(false)} />}
        <AgentDebugger />
      </Suspense>
    </>
  );
};

export const MemoizedAppLayout = memo(AppLayout);
export default AppLayout;
