
import React, { memo } from 'react';
import { InputForm } from './InputForm';
import { ReportDisplay } from './ReportDisplay';
import { LoadingIndicator } from './LoadingIndicator';
import { OrchestratorDashboard } from './OrchestratorDashboard';
import { Welcome } from './Welcome';
import { ResearchInput, ResearchReport, KnowledgeBaseEntry, Settings, ChatMessage } from '../types';
import { useKnowledgeBase } from '../contexts/KnowledgeBaseContext';
import { useTranslation } from '../hooks/useTranslation';

interface OrchestratorViewProps {
    reportStatus: 'idle' | 'generating' | 'streaming' | 'done' | 'error';
    currentPhase: string;
    error: string | null;
    report: ResearchReport | null;
    researchInput: ResearchInput | null;
    isCurrentReportSaved: boolean;
    settings: Settings;
    prefilledTopic: string | null;
    handleFormSubmit: (data: ResearchInput) => void;
    handleSaveReport: () => void;
    handleNewSearch: () => void;
    onPrefillConsumed: () => void;
    handleViewReportFromHistory: (entry: KnowledgeBaseEntry) => void;
    handleStartNewReview: (topic: string) => void;
    onUpdateResearchInput: (newInput: ResearchInput) => void;
    handleTagsUpdate: (pmid: string, newTags: string[]) => void;
    chatHistory: ChatMessage[];
    isChatting: boolean;
    onSendMessage: (message: string) => void;
}

const phaseDetails: Record<string, string[]> = {
  "Phase 1: AI Generating PubMed Queries...": [
    "Analyzing research topic and user criteria...",
    "AI is constructing advanced boolean search strings...",
    "Optimizing queries for relevance...",
  ],
  "Phase 2: Executing Real-time PubMed Search...": [
    "Connecting to live NCBI PubMed database...",
    "Submitting best query to retrieve article IDs...",
    "Compiling list of relevant publications...",
  ],
  "Phase 3: Fetching Article Details from PubMed...": [
    "Requesting abstracts and metadata for found articles...",
    "Parsing publication data (titles, authors, journals)...",
    "Preparing real-world data for AI analysis...",
  ],
  "Phase 4: AI Ranking & Analysis of Real Articles...": [
    "AI is reading and scoring each article for relevance...",
    "Writing relevance explanations based on content...",
    "Identifying key themes and generating insights...",
  ],
  "Phase 5: Synthesizing Top Findings...": [
    "Selecting top articles for the executive summary...",
    "Preparing final prompt for narrative synthesis...",
    "Initializing streaming connection with AI...",
  ],
  "Streaming Synthesis...": [
    "Receiving synthesized text in real-time...",
    "Building the narrative summary chunk by chunk...",
  ],
  "Finalizing Report...": [
    "Assembling final report structure...",
    "Finishing up...",
  ]
};

const OrchestratorViewComponent: React.FC<OrchestratorViewProps> = ({
    reportStatus,
    currentPhase,
    error,
    report,
    researchInput,
    isCurrentReportSaved,
    settings,
    prefilledTopic,
    handleFormSubmit,
    handleSaveReport,
    handleNewSearch,
    onPrefillConsumed,
    handleViewReportFromHistory,
    handleStartNewReview,
    onUpdateResearchInput,
    handleTagsUpdate,
    chatHistory,
    isChatting,
    onSendMessage,
}) => {
    const { knowledgeBase } = useKnowledgeBase();
    const { t } = useTranslation();
    
    const loadingPhases = [
        t('orchestrator.phase1'),
        t('orchestrator.phase2'),
        t('orchestrator.phase3'),
        t('orchestrator.phase4'),
        t('orchestrator.phase5'),
        t('orchestrator.phase6'),
        t('orchestrator.phase7')
    ];

    // Map generic phase strings to translated ones for display if needed, 
    // or simply pass the current phase string if it matches the translation key logic
    // For simplicity in this update, we rely on the service sending the English key 
    // and we map it here, or we update the service. 
    // Ideally, the service should emit status codes, not strings.
    // As a quick fix, we will display the passed string, but ensure the LoadingIndicator
    // receives the translated list for the progress bar.

    const isProcessing = reportStatus === 'generating' || reportStatus === 'streaming';
    const showLoadingIndicator = reportStatus === 'generating';
    const showReport = (reportStatus === 'streaming' || reportStatus === 'done') && report;

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <InputForm
                onSubmit={handleFormSubmit}
                isLoading={isProcessing}
                defaultSettings={settings.defaults}
                prefilledTopic={prefilledTopic}
                onPrefillConsumed={onPrefillConsumed}
            />

            {showLoadingIndicator && (
                <LoadingIndicator 
                    title={t('orchestrator.title')}
                    phase={currentPhase}
                    phases={loadingPhases}
                    phaseDetails={phaseDetails} // Details remain in English for now unless mapped
                    footerText="This may take up to a minute. The AI is performing multiple complex steps, including live database searches and synthesis."
                />
            )}
            
            {error && (
                <div className="text-center text-red-400 font-semibold p-8 bg-surface rounded-lg border border-red-500/20">{error}</div>
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
                />
            )}

            {!isProcessing && !error && !report && (
                 knowledgeBase.length > 0 ? (
                    <OrchestratorDashboard 
                        onViewReport={handleViewReportFromHistory} 
                        onStartNewReview={handleStartNewReview}
                    />
                ) : (
                    <Welcome />
                )
            )}
        </div>
    );
};

export default memo(OrchestratorViewComponent);
