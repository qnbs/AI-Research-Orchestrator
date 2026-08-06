import React, { Suspense, memo } from 'react';
import { Header } from '../components/Header';
import { OfflineBanner } from '../components/OfflineBanner';
import { UpdateAvailableBanner } from '../components/UpdateAvailableBanner';
import { ServiceWorkerRegistrationFailedBanner } from '../components/ServiceWorkerRegistrationFailedBanner';
import { DemoDataBanner } from '../components/DemoDataBanner';
import { Notification } from '../components/Notification';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { BottomNavBar } from '../components/BottomNavBar';
import { SkipToContentLink } from '../components/SkipToContentLink';
import { ContentSpinner, FullScreenSpinner } from './AppSpinners';
import { useAppLogic } from './useAppLogic';
import { AppViewRouter } from './AppViewRouter';
import { OnboardingView, CommandPalette, QuickAddModal, AgentDebugger } from './lazyViews';

/**
 * App shell: banners, chrome, and view routing.
 * State/effects/handlers live in useAppLogic (composed domain hooks).
 */
const AppLayout: React.FC = () => {
  const logic = useAppLogic();
  const {
    isLoading,
    isSettingsLoading,
    arePresetsLoading,
    settings,
    report,
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
    showExportModal,
    setShowExportModal,
    isQuickAddModalOpen,
    setIsQuickAddModalOpen,
    isResearching,
    handleConfirmNavigation,
    handleCompleteOnboarding,
    handleViewChange,
    handleSaveReport,
    handleExportSelection,
    handleConfirmExport,
    t,
  } = logic;

  if (isSettingsLoading || isLoading || arePresetsLoading) {
    return <FullScreenSpinner label={t('common.loading')} />;
  }

  if (!settings.hasCompletedOnboarding) {
    return (
      <Suspense fallback={<FullScreenSpinner label={t('common.loading')} />}>
        <OnboardingView onComplete={handleCompleteOnboarding} />
      </Suspense>
    );
  }

  return (
    <>
      <SkipToContentLink />
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
      <ServiceWorkerRegistrationFailedBanner />
      <main
        id="main-content"
        tabIndex={-1}
        className="container mx-auto px-4 sm:px-6 lg:px-8 md:pt-36 pt-20 pb-24 focus-ring-aa rounded-sm"
      >
        <Suspense fallback={<ContentSpinner label={t('common.loading')} />}>
          <AppViewRouter {...logic} />
        </Suspense>
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
          title={t('settings.discardUnsaved.title')}
          message={t('settings.discardUnsaved.message')}
          confirmText={t('settings.discardUnsaved.confirm')}
        />
      )}
      {showExportModal && ['pdf', 'csv', 'bib', 'ris'].includes(showExportModal) && (
        <ConfirmationModal
          onConfirm={handleConfirmExport}
          onCancel={() => setShowExportModal(null)}
          title={t('kb.export.confirmTitle', { count: selectedKbPmids.length })}
          message={t('kb.export.confirmMessage', {
            count: selectedKbPmids.length,
            format: showExportModal.toUpperCase(),
          })}
          confirmText={t('kb.export.confirm')}
        />
      )}

      <Suspense>
        {isCommandPaletteOpen && (
          <CommandPalette
            isReportVisible={Boolean(report)}
            isCurrentReportSaved={isCurrentReportSaved}
            selectedArticleCount={selectedKbPmids.length}
            onSaveReport={handleSaveReport}
            onExportSelection={handleExportSelection}
          />
        )}
        {isQuickAddModalOpen && <QuickAddModal onClose={() => setIsQuickAddModalOpen(false)} />}
        {/* Gated on the render itself, not just the header toggle: the panel's
            own isVisible Redux state can also be forced true by a research run
            starting (useResearchSession dispatches setDebuggerVisible(true)
            unconditionally), independent of developerMode. Gating here covers
            every path, not just "close it if it was already open". */}
        {settings.developerMode && <AgentDebugger />}
      </Suspense>
    </>
  );
};

export const MemoizedAppLayout = memo(AppLayout);
