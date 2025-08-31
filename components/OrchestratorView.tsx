import React from 'react';
import { InputForm } from './InputForm';
import { ReportDisplay } from './ReportDisplay';
import { LoadingIndicator } from './LoadingIndicator';
import { OrchestratorDashboard } from './OrchestratorDashboard';
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
    handleNewSearch: () => void;
    onPrefillConsumed: () => void;
    handleViewReportFromHistory: (entry: KnowledgeBaseEntry) => void;
    handleStartNewReview: (topic: string) => void;
    onUpdateResearchInput: (newInput: ResearchInput) => void;
    handleTagsUpdate: (pmid: string, newTags: string[]) => void;
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
    handleNewSearch,
    onPrefillConsumed,
    handleViewReportFromHistory,
    handleStartNewReview,
    onUpdateResearchInput,
    handleTagsUpdate,
}) => {
    const { knowledgeBase } = useKnowledgeBase();
    
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <InputForm
                onSubmit={handleFormSubmit}
                isLoading={isLoading}
                defaultSettings={settings.defaults}
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
                    onNewSearch={handleNewSearch}
                    onUpdateInput={onUpdateResearchInput}
                    onTagsUpdate={handleTagsUpdate}
                />
            )}

            {!isLoading && !error && !report && (
                 knowledgeBase.length > 0 ? (
                    <OrchestratorDashboard 
                        entries={knowledgeBase} 
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
