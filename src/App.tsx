import React, { useState, useCallback, useEffect, memo, lazy, Suspense } from 'react';
import { Header } from './components/Header';
import { ResearchInput, ResearchReport, KnowledgeBaseEntry, ChatMessage, AuthorProfile, KnowledgeBaseFilter, AggregatedArticle } from './types';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { PresetProvider, usePresets } from './contexts/PresetContext';
import { Notification } from './components/Notification';
import { ConfirmationModal } from './components/ConfirmationModal';
import { useResearchAssistant } from './hooks/useResearchAssistant';
import { generateResearchReportStream } from './services/geminiService';
import { KnowledgeBaseProvider, useKnowledgeBase } from './contexts/KnowledgeBaseContext';
import { UIProvider, useUI } from './contexts/UIContext';
import type { View } from './contexts/UIContext';
import { exportKnowledgeBaseToPdf, exportToCsv, exportCitations } from './services/exportService';
import { useChat } from './hooks/useChat';
import { BottomNavBar } from './components/BottomNavBar';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load all major view components for code splitting
const OnboardingView = lazy(() => import('./components/OnboardingView'));
const KnowledgeBaseView = lazy(() => import('./components/KnowledgeBaseView'));
const SettingsView = lazy(() => import('./components/SettingsView'));
const HelpView = lazy(() => import('./components/HelpView'));
const DashboardView = lazy(() => import('./components/DashboardView'));
const HistoryView = lazy(() => import('./components/HistoryView'));
const ResearchView = lazy(() => import('./components/ResearchView'));
const AuthorsView = lazy(() => import('./components/AuthorsView'));
const JournalsView = lazy(() => import('./components/JournalsView'));
const OrchestratorView = lazy(() => import('./components/OrchestratorView'));
const HomeView = lazy(() => import('./components/HomeView'));
const CommandPalette = lazy(() => import('./components/CommandPalette'));
const QuickAddModal = lazy(() => import('./components/QuickAddModal'));

const FullScreenSpinner: React.FC = () => (
    <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-brand-accent"></div>
    </div>
);

const ContentSpinner: React.FC = () => (
    <div className="flex h-full min-h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-brand-accent"></div>
    </div>
);


const AppLayout: React.FC = () => {
  const { isLoading } = useKnowledgeBase();
  const { isSettingsLoading, settings, updateSettings } = useSettings();
  const { arePresetsLoading } = usePresets();

  // Orchestrator State
  const [researchInput, setResearchInput] = useState<ResearchInput | null>(null);
  const [localResearchInput, setLocalResearchInput] = useState<ResearchInput | null>(null); // For editable title
  const [report, setReport] = useState<ResearchReport | null>(null);
  const [reportStatus, setReportStatus] = useState<'idle' | 'generating' | 'streaming' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [currentPhase, setCurrentPhase] = useState<string>('');
  const [selectedAuthorProfile, setSelectedAuthorProfile] = useState<AuthorProfile | null>(null);

  // App-wide State from contexts
  const { currentView, notification, setNotification, isSettingsDirty, setIsSettingsDirty, pendingNavigation, setPendingNavigation, setCurrentView, isCommandPaletteOpen, setIsCommandPaletteOpen } = useUI();
  const { knowledgeBase, saveReport, clearKnowledgeBase, uniqueArticles, updateTags } = useKnowledgeBase();

  const [isCurrentReportSaved, setIsCurrentReportSaved] = useState<boolean>(false);
  const [selectedKbPmids, setSelectedKbPmids] = useState<string[]>([]);
  const [showExportModal, setShowExportModal] = useState<'pdf' | 'csv' | 'bib' | 'ris' | null>(null);
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);
  
  // Chat Hook
  const { chatHistory, isChatting, sendMessage } = useChat(report, reportStatus, settings.ai);

  // Research Assistant Hook
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
  
  const [settingsResetToken, setSettingsResetToken] = useState(0);
  const [initialHelpTab, setInitialHelpTab] = useState<string | null>(null);
  const [prefilledTopic, setPrefilledTopic] = useState<string | null>(null);
  const [kbFilter, setKbFilter] = useState<KnowledgeBaseFilter>({
    searchTerm: '',
    selectedTopics: [],
    selectedTags: [],
    selectedArticleTypes: [],
    selectedJournals: [],
    showOpenAccessOnly: false,
  });


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
        // Accessibility Best Practice: Update document title on view change
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

    useEffect(() => {
        // Clear selection when navigating away from the knowledge base
        if (currentView !== 'knowledgeBase' && selectedKbPmids.length > 0) {
            setSelectedKbPmids([]);
        }
    }, [currentView, selectedKbPmids.length]);

  const handleFormSubmit = useCallback(async (data: ResearchInput) => {
    setReportStatus('generating');
    setError(null);
    setReport(null);
    setResearchInput(data);
    setLocalResearchInput(data); // Set local copy for editing
    setCurrentView('orchestrator');
    setIsCurrentReportSaved(false);

    try {
        const stream = generateResearchReportStream(data, settings.ai);
        let finalSynthesis = '';
        let isFirstChunk = true;
        let finalReport: ResearchReport | null = null;
        for await (const { report: partialReport, synthesisChunk, phase } of stream) {
            setCurrentPhase(phase);
            if (isFirstChunk && partialReport) {
                finalReport = partialReport;
                setReport(finalReport);
                setReportStatus('streaming');
                isFirstChunk = false;
            }

            if (synthesisChunk) {
                finalSynthesis += synthesisChunk;
                setReport(prev => prev ? { ...prev, synthesis: finalSynthesis } : null);
            }
        }
        
        const completeReport = { ...(finalReport!), synthesis: finalSynthesis };
        setReport(completeReport);
        setReportStatus('done');
        
        if (settings.defaults.autoSaveReports) {
            await saveReport(data, completeReport);
            setIsCurrentReportSaved(true);
        }
    } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred during report generation.');
        setReportStatus('error');
    }
  }, [settings.ai, settings.defaults.autoSaveReports, setCurrentView, saveReport]);

  const handleSaveReport = useCallback(async () => {
      if (report && localResearchInput) {
        await saveReport(localResearchInput, report);
        setIsCurrentReportSaved(true);
      }
  }, [report, localResearchInput, saveReport]);
  
  const handleNewSearch = useCallback(() => {
      setReport(null);
      setResearchInput(null);
      setLocalResearchInput(null);
      setReportStatus('idle');
      setError(null);
      setIsCurrentReportSaved(false);
      setCurrentView('orchestrator');
  }, [setCurrentView]);

  const handleClearKnowledgeBase = useCallback(() => {
      clearKnowledgeBase();
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
  
  const handleFilterChange = useCallback((newFilter: Partial<KnowledgeBaseFilter>) => {
      setKbFilter(prev => ({...prev, ...newFilter}));
  }, []);
  
  const handlePrefillConsumed = useCallback(() => {
      setPrefilledTopic(null);
  }, []);

  const handleStartNewReviewFromTopic = useCallback((topic: string) => {
      setPrefilledTopic(topic);
      setCurrentView('orchestrator');
  }, [setCurrentView]);

  const handleViewEntry = useCallback((entry: KnowledgeBaseEntry) => {
      if (entry.sourceType === 'research') {
        setResearchInput(entry.input);
        setLocalResearchInput(entry.input);
        setReport(entry.report);
        setReportStatus('done');
        setError(null);
        setIsCurrentReportSaved(true);
        setCurrentView('orchestrator');
      } else if (entry.sourceType === 'author') {
          setSelectedAuthorProfile(entry.profile);
          setCurrentView('authors');
      } else if (entry.sourceType === 'journal') {
          // Future: could navigate to a detailed journal view
          setCurrentView('knowledgeBase');
      }
  }, [setCurrentView]);

  const handleAuthorProfileViewed = useCallback(() => {
    setSelectedAuthorProfile(null);
  }, []);
  
  const handleTagsUpdate = useCallback(async (pmid: string, newTags: string[]) => {
    await updateTags(pmid, newTags);
    // Also update the local report state if it's being viewed
    setReport(prevReport => {
        if (!prevReport || !prevReport.rankedArticles.some(a => a.pmid === pmid)) {
            return prevReport;
        }
        return {
            ...prevReport,
            rankedArticles: prevReport.rankedArticles.map(a => 
                a.pmid === pmid ? { ...a, customTags: newTags } : a
            )
        };
    });
  }, [updateTags]);

  const handleExportSelection = useCallback((format: 'pdf' | 'csv' | 'bib' | 'ris') => {
      setShowExportModal(format);
  }, []);

  const handleConfirmExport = useCallback(() => {
      if (!showExportModal) return;
      
      const articlesToExport: AggregatedArticle[] = uniqueArticles.filter(a => selectedKbPmids.includes(a.pmid));
      if(articlesToExport.length === 0) {
          setNotification({ id: Date.now(), message: 'No articles selected for export.', type: 'error' });
          return;
      }

      switch (showExportModal) {
          case 'pdf':
              exportKnowledgeBaseToPdf(articlesToExport, 'Knowledge Base Selection', (pmid) => knowledgeBase.flatMap(e => e.sourceType === 'research' ? (e.report.aiGeneratedInsights || []) : []).filter(i => (i.supportingArticles || []).includes(pmid)), settings.export.pdf);
              break;
          case 'csv':
              exportToCsv(articlesToExport, 'knowledge_base_selection', settings.export.csv);
              break;
          case 'bib':
          case 'ris':
              exportCitations(articlesToExport, settings.export.citation, showExportModal);
              break;
      }
      setShowExportModal(null);
      setNotification({ id: Date.now(), message: `Exported ${articlesToExport.length} articles as ${showExportModal.toUpperCase()}.`, type: 'success' });

  }, [showExportModal, selectedKbPmids, uniqueArticles, settings.export, setNotification, knowledgeBase]);

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
          case 'home': return <HomeView onNavigate={handleViewChange} />;
          case 'orchestrator': return (
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
            />);
          case 'research': return (
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
            />);
           case 'authors': return <AuthorsView initialProfile={selectedAuthorProfile} onViewedInitialProfile={handleAuthorProfileViewed} />;
           case 'journals': return <JournalsView />;
           case 'knowledgeBase': return <KnowledgeBaseView onViewChange={handleViewChange} filter={kbFilter} onFilterChange={handleFilterChange} selectedPmids={selectedKbPmids} setSelectedPmids={setSelectedKbPmids} />;
           case 'dashboard': return <DashboardView onFilterChange={handleFilterChange} onViewChange={handleViewChange} />;
           case 'history': return <HistoryView onViewEntry={handleViewEntry} />;
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
         <Suspense fallback={<ContentSpinner />}>
            {renderView()}
         </Suspense>
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
      {showExportModal && ['pdf', 'csv', 'bib', 'ris'].includes(showExportModal) && <ConfirmationModal onConfirm={handleConfirmExport} onCancel={() => setShowExportModal(null)} title={`Export ${selectedKbPmids.length} Articles`} message={`Are you sure you want to export citations for the ${selectedKbPmids.length} selected articles as a ${showExportModal.toUpperCase()} file?`} confirmText="Yes, Export" />}
      
      <Suspense>
        {isCommandPaletteOpen && <CommandPalette isReportVisible={!!report} isCurrentReportSaved={isCurrentReportSaved} selectedArticleCount={selectedKbPmids.length} onSaveReport={handleSaveReport} onExportSelection={handleExportSelection}/>}
        {isQuickAddModalOpen && <QuickAddModal onClose={() => setIsQuickAddModalOpen(false)} />}
      </Suspense>
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