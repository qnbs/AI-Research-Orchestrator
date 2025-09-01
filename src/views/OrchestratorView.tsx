
import React, { memo } from 'react';
import { InputForm } from '@/components/InputForm';
import { ReportDisplay } from '@/components/ReportDisplay';
import { LoadingIndicator } from '@/components/LoadingIndicator';
import { OrchestratorDashboard } from '@/components/OrchestratorDashboard';
import { Welcome } from '@/components/Welcome';
import { useKnowledgeBase } from '@/contexts/KnowledgeBaseContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useChat } from '@/hooks/useChat';
import type { useOrchestratorLogic } from '@/hooks/useOrchestratorLogic';

interface OrchestratorViewProps {
    logic: ReturnType<typeof useOrchestratorLogic>;
}

const OrchestratorViewComponent: React.FC<OrchestratorViewProps> = ({ logic }) => {
    const {
        reportStatus,
        currentPhase,
        error,
        report,
        localResearchInput,
        isCurrentReportSaved,
        prefilledTopic,
        handleFormSubmit,
        handleSaveReport,
        handleNewSearch,
        onPrefillConsumed,
        setLocalResearchInput,
        handleTagsUpdate,
    } = logic;

    const { settings } = useSettings();
    const { knowledgeBase, handleViewEntry } = useKnowledgeBase();
    const { chatHistory, isChatting, sendMessage } = useChat(report, reportStatus, settings.ai);

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

            {showReport && localResearchInput && (
                <ReportDisplay 
                    report={report} 
                    input={localResearchInput} 
                    isSaved={isCurrentReportSaved} 
                    onSave={handleSaveReport} 
                    onNewSearch={handleNewSearch}
                    onUpdateInput={setLocalResearchInput}
                    onTagsUpdate={handleTagsUpdate}
                    chatHistory={chatHistory}
                    isChatting={isChatting}
                    onSendMessage={sendMessage}
                />
            )}

            {!isProcessing && !error && !report && (
                 knowledgeBase.length > 0 ? (
                    <OrchestratorDashboard 
                        onViewReport={handleViewEntry}
                        onStartNewReview={(topic) => logic.setPrefilledTopic(topic)}
                    />
                ) : (
                    <Welcome />
                )
            )}
        </div>
    );
};

export const OrchestratorView = memo(OrchestratorViewComponent);
