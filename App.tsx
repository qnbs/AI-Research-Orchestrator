import React, { useState, useCallback, useEffect } from 'react';
import { OnboardingView } from './components/OnboardingView';
import { Header } from './components/Header';
import { ResearchInput, ResearchReport, KnowledgeBaseFilter } from './types';
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
import { useResearchAssistant } from './hooks/useResearchAssistant';
import { generateResearchReport, PubMedAPIError, GeminiAPIError, OrchestrationError } from './services/geminiService';
import { OrchestratorView } from './components/OrchestratorView';
import { KnowledgeBaseProvider, useKnowledgeBase } from './contexts/KnowledgeBaseContext';
import { UIProvider, useUI } from './contexts/UIContext';
import type { View } from './contexts/UIContext';
import { BackToTopButton } from './components/BackToTopButton';


const AppLayout: React.FC = () => {
  // Orchestrator State
  const [researchInput, setResearchInput] = useState<ResearchInput | null>(null);
  const [report, setReport] = useState<ResearchReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPhase, setCurrentPhase] = useState<string>('');
  
  // App-wide State from contexts
  const { settings, updateSettings } = useSettings();
  const { currentView, notification, setNotification, isSettingsDirty, setIsSettingsDirty, pendingNavigation, setPendingNavigation, setCurrentView, showOnboarding, setShowOnboarding } = useUI();
  const kb = useKnowledgeBase();


  const [isCurrentReportSaved, setIsCurrentReportSaved] = useState<boolean>(false);

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

  // State for navigating to a specific help tab
  const [initialHelpTab, setInitialHelpTab] = useState<string | null>(null);

  // State for pre-filling the research topic from another view
  const [prefilledTopic, setPrefilledTopic] = useState<string | null>(null);

  // State for Knowledge Base filters (lifted state)
  const [kbFilter, setKbFilter] = useState<KnowledgeBaseFilter>({
    searchTerm: '',
    selectedTopics: [],
    selectedTags: [],
    selectedArticleTypes: [],
    selectedJournals: [],
    showOpenAccessOnly: false,
  });

  const [showBackToTop, setShowBackToTop] = useState(false);


  useEffect(() => {
      document.documentElement.className = settings.theme;
      document.documentElement.classList.toggle('no-animations', !settings.performance.enableAnimations);
      
      const fontMap: Record<string, string> = {
          'Inter': 'Inter, sans-serif',
          'Lato': 'Lato, sans-serif',
          'Roboto': 'Roboto, sans-serif',
          'Open Sans': '"Open Sans", sans-serif'
      };
      
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
    const handleScroll = () => {
        setShowBackToTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleFormSubmit = useCallback(async (data: ResearchInput) => {
    setIsLoading(true);
    setError(null);
    setReport(null);
    setResearchInput(data);
    setCurrentView('orchestrator');
    setIsCurrentReportSaved(false); // A new report is never saved by default

    try {
      const generatedReport = await generateResearchReport(data, settings.ai, setCurrentPhase);
      setReport(generatedReport);
       if (settings.defaults.autoSaveReports) {
            const saved = kb.saveReport(data, generatedReport);
            setIsCurrentReportSaved(saved);
        }
    } catch (err) {
        let errorMessage = "An unknown error occurred during the report generation. Please try again.";
        if (err instanceof PubMedAPIError) {
            errorMessage = `PubMed API Error: ${err.message} The service may be temporarily unavailable.`;
        } else if (err instanceof GeminiAPIError) {
            errorMessage = `AI Model Error: ${err.message} This might be a temporary issue with the AI service or your configuration.`;
        } else if (err instanceof OrchestrationError) {
            errorMessage = `Process Error: ${err.message} Please try adjusting your research topic or parameters.`;
        } else if (err instanceof Error) {
            errorMessage = `An unexpected error occurred: ${err.message}. Please check your internet connection.`;
        }
        setError(errorMessage);
    } finally {
      setIsLoading(false);
      setCurrentPhase('');
    }
  }, [settings.ai, settings.defaults.autoSaveReports, kb, setCurrentView]);

  const handleSaveReport = useCallback(() => {
    if (report && researchInput) {
      const saved = kb.saveReport(researchInput, report);
      setIsCurrentReportSaved(saved);
    }
  }, [report, researchInput, kb]);
  
  const handleNewSearch = useCallback(() => {
    setReport(null);
    setResearchInput(null);
    window.scrollTo(0, 0);
  }, []);

  const handleClearKnowledgeBase = () => {
      kb.clearKnowledgeBase();
      // Also clear current report if it's from the KB
      if (isCurrentReportSaved) {
          setReport(null);
          setResearchInput(null);
      }
      setCurrentView('orchestrator'); // Go back to a safe view
  };

  const handleTagsUpdate = useCallback((pmid: string, newTags: string[]) => {
      kb.updateTags(pmid, newTags);
       // Also update the current report if it's being displayed
      if (report && report.rankedArticles.some(a => a.pmid === pmid)) {
          setReport(prevReport => {
              if (!prevReport) return null;
              return {
                  ...prevReport,
                  rankedArticles: prevReport.rankedArticles.map(article =>
                      article.pmid === pmid ? { ...article, customTags: newTags } : article
                  )
              };
          });
      }
  }, [report, kb]);

  const handleConfirmNavigation = () => {
        if (pendingNavigation) {
            setCurrentView(pendingNavigation);
            setIsSettingsDirty(false); // Discard changes
            setSettingsResetToken(Date.now()); // Tell settings to reset
        }
        setPendingNavigation(null);
    };

    const handleCancelNavigation = () => {
        setPendingNavigation(null);
    };

    const handleViewChange = (view: View) => {
        if (isSettingsDirty && currentView === 'settings') {
            setPendingNavigation(view);
        } else {
            setCurrentView(view);
        }
    };
    
  const handleViewReportFromHistory = (entry: any) => {
      setResearchInput(entry.input);
      setReport(entry.report);
      setIsCurrentReportSaved(true);
      setCurrentView('orchestrator');
  };

  const handleStartNewReview = useCallback((topic: string) => {
      setPrefilledTopic(topic);
      setCurrentView('orchestrator');
      // Scroll to top to make the form visible
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
  
  const handleKbFilterChange = (newFilter: Partial<KnowledgeBaseFilter>) => {
    setKbFilter(prev => ({ ...prev, ...newFilter }));
  };

  const renderView = () => {
    switch(currentView) {
      case 'knowledgeBase':
        return <KnowledgeBaseView 
                    onViewChange={handleViewChange} 
                    filter={kbFilter}
                    onFilterChange={handleKbFilterChange}
                />;
      case 'settings':
        return <SettingsView 
                    onClearKnowledgeBase={handleClearKnowledgeBase}
                    resetToken={settingsResetToken}
                    onNavigateToHelpTab={(tab) => {
                        setInitialHelpTab(tab);
                        setCurrentView('help');
                    }}
                />;
      case 'help':
        return <HelpView initialTab={initialHelpTab} onTabConsumed={() => setInitialHelpTab(null)} />;
      case 'dashboard':
        return <DashboardView entries={kb.knowledgeBase} onFilterChange={handleKbFilterChange} onViewChange={handleViewChange}/>;
      case 'history':
        return <HistoryView onViewReport={handleViewReportFromHistory} />;
      case 'research':
        return <ResearchView 
                    onStartNewReview={handleStartNewReview}
                    onStartResearch={startResearch}
                    onClearResearch={clearResearch}
                    isLoading={isResearching}
                    phase={researchPhase}
                    error={researchError}
                    analysis={researchAnalysis}
                    similarArticlesState={similar}
                    onlineFindingsState={online}
                />;
      case 'orchestrator':
      default:
        return (
            <OrchestratorView
                isLoading={isLoading}
                currentPhase={currentPhase}
                error={error}
                report={report}
                researchInput={researchInput}
                isCurrentReportSaved={isCurrentReportSaved}
                settings={settings}
                prefilledTopic={prefilledTopic}
                handleFormSubmit={handleFormSubmit}
                handleSaveReport={handleSaveReport}
                handleTagsUpdate={handleTagsUpdate}
                handleNewSearch={handleNewSearch}
                onPrefillConsumed={() => setPrefilledTopic(null)}
                handleViewReportFromHistory={handleViewReportFromHistory}
                handleStartNewReview={handleStartNewReview}
            />
        );
    }
  };

  if (showOnboarding) {
    return <OnboardingView onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header 
        knowledgeBaseArticleCount={kb.uniqueArticles.length}
        hasReports={kb.knowledgeBase.length > 0}
        isResearching={isResearching}
      />
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        <div key={currentView} className="animate-slideInUp" style={{animationDelay: '100ms', animationDuration: '500ms'}}>
            {renderView()}
        </div>
      </main>
      {notification && (
        <Notification
          key={notification.id}
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
          position={settings.notifications.position}
          duration={settings.notifications.duration}
        />
      )}
       {pendingNavigation && (
            <ConfirmationModal
                onConfirm={handleConfirmNavigation}
                onCancel={handleCancelNavigation}
                title="Unsaved Changes"
                message="You have unsaved changes in Settings. Are you sure you want to leave and discard them?"
                confirmText="Discard Changes"
                confirmButtonClass="bg-red-600 hover:bg-red-700"
                titleClass="text-red-400"
            />
        )}
        <BackToTopButton isVisible={showBackToTop} />
    </div>
  );
}

const App: React.FC = () => (
    <SettingsProvider>
        <UIProvider>
            <KnowledgeBaseProvider>
                <PresetProvider>
                    <AppLayout />
                </PresetProvider>
            </KnowledgeBaseProvider>
        </UIProvider>
    </SettingsProvider>
);

export default App;