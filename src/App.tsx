
import React, { useState, useCallback, useEffect, memo } from 'react';
import { OnboardingView } from '@/views/OnboardingView';
import { Header } from '@/components/Header';
import { AuthorProfile } from '@/types';
import { KnowledgeBaseView } from '@/views/KnowledgeBaseView';
import SettingsView from '@/views/SettingsView';
import { SettingsProvider, useSettings } from '@/contexts/SettingsContext';
import { PresetProvider, usePresets } from '@/contexts/PresetContext';
import { HelpView } from '@/views/HelpView';
import { Notification } from '@/components/Notification';
import { DashboardView } from '@/views/DashboardView';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { HistoryView } from '@/views/HistoryView';
import { ResearchView } from '@/views/ResearchView';
import { AuthorsView } from '@/views/AuthorsView';
import { JournalsView } from '@/views/JournalsView';
import { useResearchAssistant } from '@/hooks/useResearchAssistant';
import { OrchestratorView } from '@/views/OrchestratorView';
import { KnowledgeBaseProvider, useKnowledgeBase } from '@/contexts/KnowledgeBaseContext';
import { UIProvider, useUI } from '@/contexts/UIContext';
import type { View } from '@/contexts/UIContext';
import { CommandPalette } from '@/components/CommandPalette';
import { QuickAddModal } from '@/components/QuickAddModal';
import { BottomNavBar } from '@/components/BottomNavBar';
import { HomeView } from '@/views/HomeView';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useOrchestratorLogic } from '@/hooks/useOrchestratorLogic';
import { useKnowledgeBaseViewLogic } from '@/hooks/useKnowledgeBaseViewLogic';


const AppLayout: React.FC = () => {
  const { isLoading: isKbLoading } = useKnowledgeBase();
  const { isSettingsLoading, settings, updateSettings } = useSettings();
  const { arePresetsLoading } = usePresets();
  
  // App-wide State from contexts
  const { currentView, notification, setNotification, isSettingsDirty, setIsSettingsDirty, pendingNavigation, setPendingNavigation, setCurrentView, isCommandPaletteOpen, setIsCommandPaletteOpen } = useUI();
  const { knowledgeBase, uniqueArticles, clearKnowledgeBase, handleViewEntry } = useKnowledgeBase();
  
  // App-wide state that doesn't fit into a specific view's logic hook
  const [selectedAuthorProfile, setSelectedAuthorProfile] = useState<AuthorProfile | null>(null);
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);
  const [settingsResetToken, setSettingsResetToken] = useState(0);
  const [initialHelpTab, setInitialHelpTab] = useState<string | null>(null);

  // Custom hooks for view-specific logic
  const orchestratorLogic = useOrchestratorLogic();
  const kbViewLogic = useKnowledgeBaseViewLogic();

  // Research Assistant Hook (for the "Research" tab)
  const {
      isLoading: isResearching,
      phase: researchPhase,
      error: researchError,
      analysis: researchAnalysis,
      similar,
      online,
      startResearch,
      clearResearch,
  } = useResearchAssistant(settings.ai, setCurrentView);


  useEffect(() => {
      document.documentElement.className = settings.theme;
      document.documentElement.classList.toggle('no-animations', !settings.performance.enableAnimations);
      
      const fontMap: Record<string, string> = { 'Inter': 'Inter, sans-serif', 'Lato': 'Lato, sans-serif', 'Roboto': 'Roboto, sans-serif', 'Open Sans': '"Open Sans", sans-serif' };
      document.body.style.fontFamily = fontMap[settings.appearance.fontFamily] || fontMap['Inter'];

      if (settings.appearance.customColors.enabled) {
          document.documentElement.style.setProperty('--color-brand-primary', settings.appearance.customColors.primary);
          document.documentElement.style.setProperty('--color-brand-secondary', settings.appearance.customColors.secondary);
          document.documentElement.style.setProperty('--color-brand-accent', settings.appearance.customColors.accent);
      } else {
          document.documentElement.style.removeProperty('--color-brand-primary');
          document.documentElement.style.removeProperty('--color-brand-secondary');
          document.documentElement.style.removeProperty('--color-brand-accent');
      }
  }, [settings.theme, settings.performance.enableAnimations, settings.appearance.fontFamily, settings.appearance.customColors]);
  
    useEffect(() => {
        const viewTitles: Record<View, string> = {
            home: 'Home',
            orchestrator: 'Orchestrator',
            research: 'Research',
            authors: 'Author Hub',
            journals: 'Journal Hub',
            knowledgeBase: 'Knowledge Base',
            dashboard: 'Dashboard',
            history: 'Report History',
            settings: 'Settings',
            help: 'Help & Documentation',
        };
        document.title = `${viewTitles[currentView] || 'Research'} | AI Research Orchestration Author`;
    }, [currentView]);


    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsCommandPaletteOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [setIsCommandPaletteOpen]);

  const handleClearKnowledgeBase = useCallback(async () => {
      await clearKnowledgeBase();
      setSettingsResetToken(Date.now());
  }, [clearKnowledgeBase]);

  const handleViewChange = useCallback((view: View) => {
      if (isSettingsDirty) {
          setPendingNavigation(view);
      } else {
          setCurrentView(view);
      }
  }, [isSettingsDirty, setCurrentView, setPendingNavigation]);

  const handleConfirmNavigation = useCallback(() => {
      if (pendingNavigation) {
          setIsSettingsDirty(false); // Discard changes
          setCurrentView(pendingNavigation);
          setPendingNavigation(null);
      }
  }, [pendingNavigation, setCurrentView, setPendingNavigation, setIsSettingsDirty]);

  const handleCompleteOnboarding = useCallback(() => {
    updateSettings(s => ({ ...s, hasCompletedOnboarding: true }));
  }, [updateSettings]);
  
  const handleAuthorProfileViewed = useCallback(() => {
    setSelectedAuthorProfile(null);
  }, []);

  const handleViewEntryWithAuthor = useCallback((entry: KnowledgeBaseEntry) => {
      if (entry.sourceType === 'author') {
          setSelectedAuthorProfile(entry.profile);
          setCurrentView('authors');
      } else {
          handleViewEntry(entry);
      }
  }, [handleViewEntry, setCurrentView]);

  if (isSettingsLoading || isKbLoading || arePresetsLoading) {
    return (
        <div className="flex h-screen items-center justify-center bg-background">
            <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-brand-accent"></div>
        </div>
    );
  }

  if (!settings.hasCompletedOnboarding) {
      return <OnboardingView onComplete={handleCompleteOnboarding} />;
  }
  
  const renderView = () => {
      switch (currentView) {
          case 'home': return <HomeView onNavigate={handleViewChange} />;
          case 'orchestrator': return <OrchestratorView logic={orchestratorLogic} />;
          case 'research': return (
            <ResearchView 
                onStartResearch={startResearch}
                onClearResearch={clearResearch}
                isLoading={isResearching}
                phase={researchPhase}
                error={researchError}
                analysis={researchAnalysis}
                similarArticlesState={similar}
                onlineFindingsState={online}
            />);
           case 'authors': return <AuthorsView initialProfile={selectedAuthorProfile} onViewedInitialProfile={handleAuthorProfileViewed} />;
           case 'journals': return <JournalsView />;
           case 'knowledgeBase': return <KnowledgeBaseView logic={kbViewLogic} />;
           case 'dashboard': return <DashboardView onFilterChange={kbViewLogic.handleFilterChange} onViewChange={handleViewChange} />;
           case 'history': return <HistoryView onViewEntry={handleViewEntryWithAuthor} />;
           case 'settings': return <SettingsView onClearKnowledgeBase={handleClearKnowledgeBase} resetToken={settingsResetToken} onNavigateToHelpTab={(tab) => { setInitialHelpTab(tab); setCurrentView('help'); }} />;
           case 'help': return <HelpView initialTab={initialHelpTab} onTabConsumed={() => setInitialHelpTab(null)} />;
           default: return <HomeView onNavigate={handleViewChange} />;
      }
  };

  return (
    <>
      <Header 
          onViewChange={handleViewChange} 
          knowledgeBaseArticleCount={uniqueArticles.length} 
          hasReports={knowledgeBase.length > 0}
          isResearching={isResearching}
          onQuickAdd={() => setIsQuickAddModalOpen(true)}
      />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:pb-24">
         {renderView()}
      </main>
      <BottomNavBar 
        currentView={currentView}
        onViewChange={handleViewChange}
        knowledgeBaseArticleCount={uniqueArticles.length}
        hasReports={knowledgeBase.length > 0}
        isResearching={isResearching}
      />
      {notification && <Notification {...notification} onClose={() => setNotification(null)} position={settings.notifications.position} duration={settings.notifications.duration} />}
      {pendingNavigation && <ConfirmationModal onConfirm={handleConfirmNavigation} onCancel={() => setPendingNavigation(null)} title="Discard Unsaved Changes?" message="You have unsaved changes in Settings. Are you sure you want to discard them and navigate away?" confirmText="Yes, Discard Changes" />}
      {kbViewLogic.showExportModal && (
          <ConfirmationModal 
            onConfirm={kbViewLogic.handleConfirmExport} 
            onCancel={() => kbViewLogic.setShowExportModal(null)} 
            title={`Export ${kbViewLogic.selectedPmids.length} Articles`} 
            message={`Are you sure you want to export citations for the ${kbViewLogic.selectedPmids.length} selected articles as a ${kbViewLogic.showExportModal.toUpperCase()} file?`} 
            confirmText={kbViewLogic.isExporting ? 'Exporting...' : 'Yes, Export'}
            isConfirming={kbViewLogic.isExporting}
         />
      )}
      {isCommandPaletteOpen && <CommandPalette 
        isReportVisible={!!orchestratorLogic.report} 
        isCurrentReportSaved={orchestratorLogic.isCurrentReportSaved} 
        selectedArticleCount={kbViewLogic.selectedPmids.length} 
        onSaveReport={orchestratorLogic.handleSaveReport} 
        onExportSelection={kbViewLogic.setShowExportModal}
      />}
      {isQuickAddModalOpen && <QuickAddModal onClose={() => setIsQuickAddModalOpen(false)} />}
    </>
  );
};


const MemoizedAppLayout = memo(AppLayout);

const App: React.FC = () => (
  <ErrorBoundary>
    <UIProvider>
      <SettingsProvider>
          <PresetProvider>
              <KnowledgeBaseProvider>
                  <MemoizedAppLayout />
              </KnowledgeBaseProvider>
          </PresetProvider>
      </SettingsProvider>
    </UIProvider>
  </ErrorBoundary>
);

export default App;
