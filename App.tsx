
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { InputForm } from './components/InputForm';
import { ReportDisplay } from './components/ReportDisplay';
import { LoadingIndicator } from './components/LoadingIndicator';
import { Welcome } from './components/Welcome';
import { Header, View } from './components/Header';
import { generateResearchReport } from './services/geminiService';
import { ResearchInput, ResearchReport, KnowledgeBaseEntry, AggregatedArticle } from './types';
import { KnowledgeBaseView } from './components/KnowledgeBaseView';
import { SettingsView } from './components/SettingsView';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { HelpView } from './components/HelpView';
import { Notification } from './components/Notification';


const KNOWLEDGE_BASE_STORAGE_KEY = 'aiResearchKnowledgeBase';

const AppContent: React.FC = () => {
  const [researchInput, setResearchInput] = useState<ResearchInput | null>(null);
  const [report, setReport] = useState<ResearchReport | null>(null);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBaseEntry[]>(() => {
    try {
        const storedKB = localStorage.getItem(KNOWLEDGE_BASE_STORAGE_KEY);
        return storedKB ? JSON.parse(storedKB) : [];
    } catch (error) {
        console.error("Failed to parse knowledge base from localStorage", error);
        return [];
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPhase, setCurrentPhase] = useState<string>('');
  const [currentView, setCurrentView] = useState<View>('orchestrator');
  const { settings } = useSettings();
  const [notification, setNotification] = useState<{ id: number; message: string; type: 'success' | 'error' } | null>(null);
  const [isCurrentReportSaved, setIsCurrentReportSaved] = useState<boolean>(false);


  const showNotification = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ id: Date.now(), message, type });
  }, []);


  useEffect(() => {
    try {
        localStorage.setItem(KNOWLEDGE_BASE_STORAGE_KEY, JSON.stringify(knowledgeBase));
    } catch (error) {
        console.error("Failed to save knowledge base to localStorage", error);
    }
  }, [knowledgeBase]);

  useEffect(() => {
      document.documentElement.className = settings.theme;
      document.documentElement.classList.toggle('no-animations', !settings.performance.enableAnimations);
  }, [settings.theme, settings.performance.enableAnimations]);

  const loadingPhases = [
    "Phase 1: Formulating Advanced PubMed Queries...",
    "Phase 2: Retrieving and Scanning Article Abstracts...",
    "Phase 3: Filtering Articles Based on Criteria...",
    "Phase 4: Ranking Articles for Relevance...",
    "Phase 5: Synthesizing Top Findings & Extracting Keywords...",
    "Finalizing Report..."
  ];

  const handleFormSubmit = useCallback(async (data: ResearchInput) => {
    setIsLoading(true);
    setError(null);
    setReport(null);
    setResearchInput(data);
    setCurrentView('orchestrator');
    setIsCurrentReportSaved(false); // A new report is never considered saved initially

    let phaseIndex = 0;
    setCurrentPhase(loadingPhases[phaseIndex]);
    const phaseInterval = setInterval(() => {
      phaseIndex++;
      if (phaseIndex < loadingPhases.length) {
        setCurrentPhase(loadingPhases[phaseIndex]);
      } else {
        clearInterval(phaseInterval);
      }
    }, 3000);

    try {
      const result = await generateResearchReport(data, settings.ai);
      setReport(result);

      if (settings.defaults.autoSaveReports) {
          const isDuplicate = knowledgeBase.some(entry => JSON.stringify(entry.input) === JSON.stringify(data));
          if (!isDuplicate) {
              setKnowledgeBase(prev => [...prev, { input: data, report: result }]);
              setIsCurrentReportSaved(true);
              showNotification("Report automatically saved to Knowledge Base.", 'success');
          } else {
              setIsCurrentReportSaved(true); // It's a duplicate, so it's already "saved"
          }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      console.error(err);
    } finally {
      clearInterval(phaseInterval);
      setIsLoading(false);
    }
  }, [knowledgeBase, settings.ai, settings.defaults.autoSaveReports, showNotification]);

  const handleSaveCurrentReport = useCallback(() => {
    if (report && researchInput && !isCurrentReportSaved) {
        const isDuplicate = knowledgeBase.some(entry => JSON.stringify(entry.input) === JSON.stringify(researchInput));
        if (!isDuplicate) {
            setKnowledgeBase(prev => [...prev, { input: researchInput, report }]);
            setIsCurrentReportSaved(true);
            showNotification("Report saved to Knowledge Base.", 'success');
        } else {
            setIsCurrentReportSaved(true);
            showNotification("This exact report is already in the Knowledge Base.", 'error');
        }
    }
  }, [report, researchInput, knowledgeBase, isCurrentReportSaved, showNotification]);
  
  const handleClearKnowledgeBase = useCallback(() => {
    setKnowledgeBase([]);
    showNotification("Knowledge Base successfully cleared.", 'success');
    if (currentView === 'knowledgeBase') {
        setCurrentView('orchestrator');
    }
  }, [showNotification, currentView]);
  
  const handleMergeDuplicates = useCallback(() => {
    const articleMap = new Map<string, AggregatedArticle>();
    let articlesScanned = 0;

    // Step 1: Find the single best version of each unique article across all reports.
    knowledgeBase.forEach(entry => {
        entry.report.rankedArticles.forEach(article => {
            articlesScanned++;
            const existing = articleMap.get(article.pmid);
            // Keep the article with the highest relevance score.
            if (!existing || article.relevanceScore > existing.relevanceScore) {
                articleMap.set(article.pmid, { ...article, sourceReportTopic: entry.input.researchTopic });
            }
        });
    });

    const uniqueArticleCount = articleMap.size;
    const duplicateCount = articlesScanned - uniqueArticleCount;

    if (duplicateCount === 0) {
        showNotification("No duplicate articles found to merge.", "success");
        return;
    }
    
    // Step 2: Rebuild the entire knowledge base, ensuring that each report
    // only contains articles that are the definitive "best versions".
    const seenPmids = new Set<string>();
    const finalKb = knowledgeBase.map(entry => {
        const uniqueArticlesForEntry = entry.report.rankedArticles.filter(article => {
            // If we've already added this article to our new KB, skip.
            if (seenPmids.has(article.pmid)) {
                return false;
            }
            
            const bestVersion = articleMap.get(article.pmid);
            
            // Keep this specific article instance only if its score matches the best score.
            // This correctly handles the case where an article appears in multiple reports
            // but ensures only the highest-scored version(s) are considered.
            if (bestVersion && article.relevanceScore === bestVersion.relevanceScore) {
                 seenPmids.add(article.pmid); // Mark as 'processed' to ensure it's only added once.
                 return true;
            }
            
            return false;
        });

        return {
            ...entry,
            report: {
                ...entry.report,
                rankedArticles: uniqueArticlesForEntry,
            },
        };
    }).filter(entry => entry.report.rankedArticles.length > 0); // Clean up any reports that are now empty.

    setKnowledgeBase(finalKb);
    showNotification(`Removed ${duplicateCount} duplicate article entries, keeping the highest-scored version of each.`, "success");

}, [knowledgeBase, showNotification]);


  const handleDeleteArticles = useCallback((pmidsToDelete: string[]) => {
      const pmidsSet = new Set(pmidsToDelete);
      setKnowledgeBase(currentKb => 
          currentKb.map(entry => ({
              ...entry,
              report: {
                  ...entry.report,
                  rankedArticles: entry.report.rankedArticles.filter(article => !pmidsSet.has(article.pmid))
              }
          })).filter(entry => entry.report.rankedArticles.length > 0) // Optionally remove reports that become empty
      );
      showNotification(`${pmidsToDelete.length} article(s) deleted.`, 'success');
  }, [showNotification]);
  
  const handleTagsUpdate = useCallback((pmid: string, newTags: string[]) => {
    setKnowledgeBase(currentKb =>
      currentKb.map(entry => ({
        ...entry,
        report: {
          ...entry.report,
          rankedArticles: entry.report.rankedArticles.map(article =>
            article.pmid === pmid
              ? { ...article, customTags: newTags }
              : article
          ),
        },
      }))
    );
  }, []);

  const knowledgeBaseArticleCount = useMemo(() => {
      const uniquePmids = new Set<string>();
      knowledgeBase.forEach(entry => {
          entry.report.rankedArticles.forEach(a => uniquePmids.add(a.pmid));
      });
      return uniquePmids.size;
  }, [knowledgeBase]);


  const renderMainContent = () => {
    switch (currentView) {
      case 'orchestrator':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <InputForm
                onSubmit={handleFormSubmit}
                isLoading={isLoading}
                defaultMaxArticlesToScan={settings.defaults.maxArticlesToScan}
                defaultTopNToSynthesize={settings.defaults.topNToSynthesize}
              />
            </div>
            <div className="lg:col-span-2">
              <div className="bg-surface rounded-lg border border-border shadow-2xl shadow-black/20 p-6 min-h-[calc(100vh-200px)] flex flex-col">
                {isLoading && <LoadingIndicator phase={currentPhase} />}
                {error && <div className="text-center text-red-400 font-semibold p-8 m-auto">Error: {error}</div>}
                {!isLoading && !error && !report && <Welcome />}
                {report && researchInput && <ReportDisplay report={report} input={researchInput} isSaved={isCurrentReportSaved} onSave={handleSaveCurrentReport} />}
              </div>
            </div>
          </div>
        );
      case 'knowledgeBase':
        return <KnowledgeBaseView entries={knowledgeBase} onClear={handleClearKnowledgeBase} onViewChange={setCurrentView} onDeleteSelected={handleDeleteArticles} onTagsUpdate={handleTagsUpdate} />;
      case 'settings':
        return <SettingsView knowledgeBase={knowledgeBase} setKnowledgeBase={setKnowledgeBase} onClearKnowledgeBase={handleClearKnowledgeBase} showNotification={showNotification} knowledgeBaseArticleCount={knowledgeBaseArticleCount} onMergeDuplicates={handleMergeDuplicates} />;
      case 'help':
        return <HelpView />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen font-sans">
      <Header 
        currentView={currentView}
        onViewChange={setCurrentView}
        knowledgeBaseArticleCount={knowledgeBaseArticleCount}
        hasReports={knowledgeBase.length > 0}
      />
      
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        {renderMainContent()}
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
    </div>
  );
};


const App: React.FC = () => (
    <SettingsProvider>
        <AppContent />
    </SettingsProvider>
);


export default App;
