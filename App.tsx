

import React, { useState, useCallback, useEffect } from 'react';
import { OnboardingView } from './components/OnboardingView';
import { Header } from './components/Header';
import { ResearchInput, ResearchReport, KnowledgeBaseFilter, KnowledgeBaseEntry, AggregatedArticle, ChatMessage, AuthorProfile } from './types';
import { KnowledgeBaseView } from './components/KnowledgeBaseView';
import SettingsView from './components/SettingsView';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { PresetProvider } from './contexts/PresetContext';
import { HelpView } from './components/HelpView';
import { Notification } from './components/Notification';
import { DashboardView } from './components/DashboardView';
import { ConfirmationModal } from './components/ConfirmationModal';
import { HistoryView } from './components/HistoryView';
import { ResearchView } from './components/ResearchView';
import { AuthorsView } from './components/AuthorsView';
import { useResearchAssistant } from './hooks/useResearchAssistant';
import { generateResearchReportStream } from './services/geminiService';
import { OrchestratorView } from './components/OrchestratorView';
import { KnowledgeBaseProvider, useKnowledgeBase } from './contexts/KnowledgeBaseContext';
import { UIProvider, useUI } from './contexts/UIContext';
import type { View } from './contexts/UIContext';
import { CommandPalette } from './components/CommandPalette';
import { exportKnowledgeBaseToPdf, exportToCsv, exportCitations } from './services/exportService';
import { QuickAddModal } from './components/QuickAddModal';
import { useChat } from './hooks/useChat';
import { BottomNavBar } from './components/BottomNavBar';
import { HomeView } from './components/HomeView';
import ErrorBoundary from './components/ErrorBoundary';


const AppLayout: React.FC = () => {
  // Orchestrator State
  const [researchInput, setResearchInput] = useState<ResearchInput | null>(null);
  const [localResearchInput, setLocalResearchInput] = useState<ResearchInput | null>(null); // For editable title
  const [report, setReport] = useState<ResearchReport | null>(null);
  const [reportStatus, setReportStatus] = useState<'idle' | 'generating' | 'streaming' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [currentPhase, setCurrentPhase] = useState<string>('');
  const [selectedAuthorProfile, setSelectedAuthorProfile] = useState<AuthorProfile | null>(null);

  // App-wide State from contexts
  const { settings } = useSettings();
  const { currentView, notification, setNotification, isSettingsDirty, setIsSettingsDirty, pendingNavigation, setPendingNavigation, setCurrentView, showOnboarding, setShowOnboarding, isCommandPaletteOpen, setIsCommandPaletteOpen } = useUI();
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
      for await (const chunk of stream) {
        if(chunk.phase) setCurrentPhase(chunk.phase);
        if (chunk.report) {
          setReport(chunk.report);
          setReportStatus('streaming');
        }
        if (chunk.synthesisChunk) {
          setReport(prev => prev ? { ...prev, synthesis: (prev.synthesis || '') + chunk.synthesisChunk } : null);
        }
      }
      setReportStatus('done');
       if (settings.defaults.autoSaveReports) {
            // Need to get the final report state
            setReport(currentReport => {
                if(currentReport) {
                    const saved = saveReport(data, currentReport);
                    setIsCurrentReportSaved(saved);
                }
                return currentReport;
            });
        }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
      setReportStatus('error');
    } finally {
      setCurrentPhase('');
    }
  }, [settings.ai, settings.defaults.autoSaveReports, saveReport, setCurrentView]);

  const handleSaveReport = useCallback(() => {
    if (report && localResearchInput) {
      const saved = saveReport(localResearchInput, report);
      setIsCurrentReportSaved(saved);
      if (saved) {
          setResearchInput(localResearchInput); // Solidify the title change upon successful save
      }
    }
  }, [report, localResearchInput, saveReport]);
  
  const handleNewSearch = useCallback(() => {
    setReport(null);
    setResearchInput(null);
    setLocalResearchInput(null);
    setReportStatus('idle');
    setCurrentView('orchestrator');
    window.scrollTo(0, 0);
  }, [setCurrentView]);

  const handleClearKnowledgeBase = () => {
      clearKnowledgeBase();
      if (isCurrentReportSaved) {
          setReport(null);
          setResearchInput(null);
          setLocalResearchInput(null);
          setReportStatus('idle');
      }
      setCurrentView('orchestrator');
  };

  const handleConfirmNavigation = () => {
        if (pendingNavigation) {
            setCurrentView(pendingNavigation);
            setIsSettingsDirty(false);
            setSettingsResetToken(Date.now());
        }
        setPendingNavigation(null);
    };

    const handleCancelNavigation = () => setPendingNavigation(null);

    const handleViewChange = (view: View) => {
        if (isSettingsDirty && currentView === 'settings') setPendingNavigation(view);
        else setCurrentView(view);
    };
    
    const handleViewEntryFromHistory = (entry: KnowledgeBaseEntry) => {
      if (entry.sourceType === 'research') {
        setResearchInput(entry.input);
        setLocalResearchInput(entry.input); // Also set local state for consistency
        setReport(entry.report);
        setIsCurrentReportSaved(true);
        setReportStatus('done');
        setCurrentView('orchestrator');
      } else if (entry.sourceType === 'author') {
        setSelectedAuthorProfile(entry.profile);
        setCurrentView('authors');
      }
    };

  const handleStartNewReview = useCallback((topic: string) => {
      setPrefilledTopic(topic);
      setCurrentView('orchestrator');
      window.scrollTo(0, 0);
  }, [setCurrentView]);

  const handleOnboardingComplete = () => {
    try {
        localStorage.setItem('hasCompletedOnboarding', 'true');
    } catch (error) {
        console.error("Could not save onboarding state to localStorage", error);
    }
    setShowOnboarding(false);
  };
  
  const handleKbFilterChange = (newFilter: Partial<KnowledgeBaseFilter>) => setKbFilter(prev => ({ ...prev, ...newFilter }));
  
  const handleExportSelection = (format: 'pdf' | 'csv' | 'bib' | 'ris') => setShowExportModal(format);
  
  const confirmExport = () => {
      if (!showExportModal) return;
      const articlesToExport = uniqueArticles.filter(a => selectedKbPmids.includes(a.pmid));
      if(articlesToExport.length === 0) return;
      const findRelatedInsights = (pmid: string) => knowledgeBase.flatMap(e => e.sourceType === 'research' ? (e.report.aiGeneratedInsights || []) : []).filter(i => (i.supportingArticles || []).includes(pmid));

      if (showExportModal === 'pdf') exportKnowledgeBaseToPdf(articlesToExport, 'Knowledge Base Selection', findRelatedInsights, settings.export.pdf);
      if (showExportModal === 'csv') exportToCsv(articlesToExport, 'knowledge_base', settings.export.csv);
      if (showExportModal === 'bib' || showExportModal === 'ris') exportCitations(articlesToExport, settings.export.citation, showExportModal);
      setShowExportModal(null);
  }
  
  const handleTagsUpdate = useCallback((pmid: string, newTags: string[]) => {
      // First, update the temporary report state for immediate UI feedback
      setReport(currentReport => {
          if (!currentReport) return null;
          return {
              ...currentReport,
              rankedArticles: currentReport.rankedArticles.map(article => 
                  article.pmid === pmid ? { ...article, customTags: newTags } : article
              )
          };
      });
      // Then, persist the change to the knowledge base
      updateTags(pmid, newTags);
  }, [updateTags]);

  const renderView = () => {
    switch(currentView) {
      case 'home':
        return <HomeView onNavigate={handleViewChange} />;
      case 'knowledgeBase':
        return <KnowledgeBaseView 
                    onViewChange={handleViewChange} 
                    filter={kbFilter}
                    onFilterChange={handleKbFilterChange}
                    selectedPmids={selectedKbPmids}
                    setSelectedPmids={setSelectedKbPmids}
                />;
      case 'authors': return <AuthorsView initialProfile={selectedAuthorProfile} onViewedInitialProfile={() => setSelectedAuthorProfile(null)} />;
      case 'settings':
        return <SettingsView 
                    onClearKnowledgeBase={handleClearKnowledgeBase}
                    resetToken={settingsResetToken}
                    onNavigateToHelpTab={(tab) => { setInitialHelpTab(tab); setCurrentView('help'); }}
                />;
      case 'help': return <HelpView initialTab={initialHelpTab} onTabConsumed={() => setInitialHelpTab(null)} />;
      case 'dashboard': return <DashboardView onFilterChange={handleKbFilterChange} onViewChange={handleViewChange}/>;
      case 'history': return <HistoryView onViewEntry={handleViewEntryFromHistory} />;
      case 'research':
        return <ResearchView onStartNewReview={handleStartNewReview} onStartResearch={startResearch} onClearResearch={clearResearch} isLoading={isResearching} phase={researchPhase} error={researchError} analysis={researchAnalysis} similarArticlesState={similar} onlineFindingsState={online} />;
      case 'orchestrator':
      default:
        // Fix: Renamed prop 'handleViewEntryFromHistory' to 'handleViewReportFromHistory' to match the component's props.
        return <OrchestratorView reportStatus={reportStatus} currentPhase={currentPhase} error={error} report={report} researchInput={localResearchInput ?? researchInput} isCurrentReportSaved={isCurrentReportSaved} settings={settings} prefilledTopic={prefilledTopic} handleFormSubmit={handleFormSubmit} handleSaveReport={handleSaveReport} handleNewSearch={handleNewSearch} onPrefillConsumed={() => setPrefilledTopic(null)} handleViewReportFromHistory={handleViewEntryFromHistory} handleStartNewReview={handleStartNewReview} onUpdateResearchInput={setLocalResearchInput} handleTagsUpdate={handleTagsUpdate} chatHistory={chatHistory} isChatting={isChatting} onSendMessage={sendMessage} />;
    }
  };

  if (showOnboarding) {
    return <OnboardingView onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {isQuickAddModalOpen && <QuickAddModal onClose={() => setIsQuickAddModalOpen(false)} />}
      <CommandPalette 
          isReportVisible={!!report}
          isCurrentReportSaved={isCurrentReportSaved}
          selectedArticleCount={selectedKbPmids.length}
          onSaveReport={handleSaveReport}
          onExportSelection={handleExportSelection}
      />
      <Header 
        onViewChange={handleViewChange}
        knowledgeBaseArticleCount={uniqueArticles.length}
        hasReports={knowledgeBase.length > 0}
        isResearching={isResearching}
        onQuickAdd={() => setIsQuickAddModalOpen(true)}
      />
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
        <div key={currentView} className="animate-slideInUp" style={{animationDelay: '100ms', animationDuration: '500ms'}}>
            {renderView()}
        </div>
      </main>
      {notification && <Notification key={notification.id} message={notification.message} type={notification.type} onClose={() => setNotification(null)} position={settings.notifications.position} duration={settings.notifications.duration} />}
       {pendingNavigation && <ConfirmationModal onConfirm={handleConfirmNavigation} onCancel={handleCancelNavigation} title="Unsaved Changes" message="You have unsaved changes in Settings. Are you sure you want to leave and discard them?" confirmText="Discard Changes" />}
       {showExportModal && <ConfirmationModal onConfirm={confirmExport} onCancel={() => setShowExportModal(null)} title={`Export ${selectedKbPmids.length} Articles`} message={`Are you sure you want to export the ${selectedKbPmids.length} selected articles as a ${showExportModal.toUpperCase()} file?`} confirmText="Yes, Export" confirmButtonClass="bg-brand-accent hover:bg-opacity-90" titleClass="text-brand-accent" />}
        <BottomNavBar
            currentView={currentView}
            onViewChange={handleViewChange}
            knowledgeBaseArticleCount={uniqueArticles.length}
            hasReports={knowledgeBase.length > 0}
            isResearching={isResearching}
        />
    </div>
  );
}

const App: React.FC = () => (
    <ErrorBoundary>
        <SettingsProvider>
            <UIProvider>
                <KnowledgeBaseProvider>
                    <PresetProvider>
                        <AppLayout />
                    </PresetProvider>
                </KnowledgeBaseProvider>
            </UIProvider>
        </SettingsProvider>
    </ErrorBoundary>
);

export default App;