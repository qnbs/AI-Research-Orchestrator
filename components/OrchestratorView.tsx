import React from 'react';
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

export const OrchestratorView: React.FC<OrchestratorViewProps> = ({
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

            {showLoadingIndicator && <LoadingIndicator phase={currentPhase} />}
            
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
