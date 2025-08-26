import React, { useState, useCallback, useEffect } from 'react';
import { InputForm } from './components/InputForm';
import { ReportDisplay } from './components/ReportDisplay';
import { LoadingIndicator } from './components/LoadingIndicator';
import { Welcome } from './components/Welcome';
import { Header, View } from './components/Header';
import { generateResearchReport } from './services/geminiService';
import { ResearchInput, ResearchReport } from './types';
import { KnowledgeBaseView } from './components/KnowledgeBaseView';

const KNOWLEDGE_BASE_STORAGE_KEY = 'aiResearchKnowledgeBase';

const App: React.FC = () => {
  const [researchInput, setResearchInput] = useState<ResearchInput | null>(null);
  const [report, setReport] = useState<ResearchReport | null>(null);
  const [knowledgeBase, setKnowledgeBase] = useState<ResearchReport[]>(() => {
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

  useEffect(() => {
    try {
        localStorage.setItem(KNOWLEDGE_BASE_STORAGE_KEY, JSON.stringify(knowledgeBase));
    } catch (error) {
        console.error("Failed to save knowledge base to localStorage", error);
    }
  }, [knowledgeBase]);

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
      const result = await generateResearchReport(data);
      setReport(result);
      setKnowledgeBase(prev => [...prev, result]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      console.error(err);
    } finally {
      clearInterval(phaseInterval);
      setIsLoading(false);
    }
  }, []);
  
  const handleClearKnowledgeBase = useCallback(() => {
    if (window.confirm("Are you sure you want to permanently delete your entire knowledge base? This action cannot be undone.")) {
        setKnowledgeBase([]);
        setCurrentView('orchestrator'); // Switch view back if KB is now empty
    }
  }, []);
  
  const knowledgeBaseArticleCount = knowledgeBase.reduce((acc, r) => acc + r.rankedArticles.length, 0);

  const renderOrchestratorView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <InputForm onSubmit={handleFormSubmit} isLoading={isLoading} />
      </div>

      <div className="lg:col-span-2">
        <div className="bg-dark-surface rounded-lg border border-dark-border shadow-2xl shadow-black/20 p-6 min-h-[calc(100vh-200px)] flex flex-col">
          {isLoading && <LoadingIndicator phase={currentPhase} />}
          {error && <div className="text-center text-red-400 font-semibold p-8 m-auto">Error: {error}</div>}
          {!isLoading && !error && !report && <Welcome />}
          {report && researchInput && <ReportDisplay report={report} input={researchInput} />}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen font-sans">
      <Header 
        currentView={currentView}
        onViewChange={setCurrentView}
        knowledgeBaseArticleCount={knowledgeBaseArticleCount}
        hasReports={knowledgeBase.length > 0}
      />
      
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        {currentView === 'orchestrator' ? renderOrchestratorView() : <KnowledgeBaseView reports={knowledgeBase} onClear={handleClearKnowledgeBase} onViewChange={setCurrentView} />}
      </main>
    </div>
  );
};

export default App;
