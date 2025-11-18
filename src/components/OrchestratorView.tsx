import React, { memo } from 'react';
import { InputForm } from './InputForm';
import { ReportDisplay } from './ReportDisplay';
import { LoadingIndicator } from './LoadingIndicator';
import { OrchestratorDashboard } from './OrchestratorDashboard';
import { Welcome } from './Welcome';
import { ResearchInput, ResearchReport, KnowledgeBaseEntry, Settings, ChatMessage } from '../types';
import { useKnowledgeBase } from '../contexts/KnowledgeBaseContext';

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

const loadingPhases = [
  "Phase 1: AI Generating PubMed Queries...",
  "Phase 2: Executing Real-time PubMed Search...",
  "Phase 3: Fetching Article Details from PubMed...",
  "Phase 4: AI Ranking & Analysis of Real Articles...",
  "Phase 5: Synthesizing Top Findings...",
  "Streaming Synthesis...",
  "Finalizing Report..."
] as const;

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
                    title="Orchestrating AI Agents..."
                    phase={currentPhase}
                    phases={loadingPhases}
                    phaseDetails={phaseDetails}
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
