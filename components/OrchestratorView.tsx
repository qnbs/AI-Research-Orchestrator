import React from 'react';
import { InputForm } from './InputForm';
import { ReportDisplay } from './ReportDisplay';
import { LoadingIndicator } from './LoadingIndicator';
import { Welcome } from './Welcome';
import { ResearchInput, ResearchReport, KnowledgeBaseEntry, Settings } from '../types';
import { useKnowledgeBase } from '../contexts/KnowledgeBaseContext';

interface OrchestratorViewProps {
    isLoading: boolean;
    currentPhase: string;
    error: string | null;
    report: ResearchReport | null;
    researchInput: ResearchInput | null;
    isCurrentReportSaved: boolean;
    settings: Settings;
    prefilledTopic: string | null;
    handleFormSubmit: (data: ResearchInput) => void;
    handleSaveReport: () => void;
    handleTagsUpdate: (pmid: string, newTags: string[]) => void;
    handleNewSearch: () => void;
    onPrefillConsumed: () => void;
    handleViewReportFromHistory: (entry: KnowledgeBaseEntry) => void;
    handleStartNewReview: (topic: string) => void;
}

export const OrchestratorView: React.FC<OrchestratorViewProps> = ({
    isLoading,
    currentPhase,
    error,
    report,
    researchInput,
    isCurrentReportSaved,
    settings,
    prefilledTopic,
    handleFormSubmit,
    handleSaveReport,
    handleTagsUpdate,
    handleNewSearch,
    onPrefillConsumed,
    handleViewReportFromHistory,
    handleStartNewReview,
}) => {
    const { knowledgeBase } = useKnowledgeBase();
    
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <InputForm
                onSubmit={handleFormSubmit}
                isLoading={isLoading}
                settings={settings}
                prefilledTopic={prefilledTopic}
                onPrefillConsumed={onPrefillConsumed}
            />

            {isLoading && <LoadingIndicator phase={currentPhase} />}
            
            {error && (
                <div className="text-center text-red-400 font-semibold p-8 bg-surface rounded-lg border border-red-500/20">{error}</div>
            )}

            {!isLoading && !error && report && researchInput && (
                <ReportDisplay 
                    report={report} 
                    input={researchInput} 
                    isSaved={isCurrentReportSaved} 
                    onSave={handleSaveReport} 
                    onTagsUpdate={handleTagsUpdate}
                    onNewSearch={handleNewSearch}
                />
            )}

            {!isLoading && !error && !report && (
                <Welcome 
                    entries={knowledgeBase} 
                    onViewReport={handleViewReportFromHistory} 
                    onStartNewReview={handleStartNewReview}
                />
            )}
        </div>
    );
};