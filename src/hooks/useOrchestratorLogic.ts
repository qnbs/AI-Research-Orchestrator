
import { useState, useCallback } from 'react';
import { ResearchInput, ResearchReport } from '@/types';
import { useSettings } from '@/contexts/SettingsContext';
import { useKnowledgeBase } from '@/contexts/KnowledgeBaseContext';
import { useUI } from '@/contexts/UIContext';
import { generateResearchReportStream } from '@/services/geminiService';

export const useOrchestratorLogic = () => {
    const { settings } = useSettings();
    const { saveReport } = useKnowledgeBase();
    const { setCurrentView } = useUI();
    
    const [researchInput, setResearchInput] = useState<ResearchInput | null>(null);
    const [localResearchInput, setLocalResearchInput] = useState<ResearchInput | null>(null);
    const [report, setReport] = useState<ResearchReport | null>(null);
    const [reportStatus, setReportStatus] = useState<'idle' | 'generating' | 'streaming' | 'done' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);
    const [currentPhase, setCurrentPhase] = useState<string>('');
    const [isCurrentReportSaved, setIsCurrentReportSaved] = useState<boolean>(false);
    const [prefilledTopic, setPrefilledTopic] = useState<string | null>(null);

    const handleFormSubmit = useCallback(async (data: ResearchInput) => {
        setReportStatus('generating');
        setError(null);
        setReport(null);
        setResearchInput(data);
        setLocalResearchInput(data);
        setCurrentView('orchestrator');
        setIsCurrentReportSaved(false);

        try {
            const stream = generateResearchReportStream(data, settings.ai);
            let finalSynthesis = '';
            let isFirstChunk = true;
            let finalReport: ResearchReport | null = null;
            for await (const { report: partialReport, synthesisChunk, phase } of stream) {
                setCurrentPhase(phase);
                if (isFirstChunk && partialReport) {
                    finalReport = partialReport;
                    setReport(finalReport);
                    setReportStatus('streaming');
                    isFirstChunk = false;
                }

                if (synthesisChunk) {
                    finalSynthesis += synthesisChunk;
                    setReport(prev => prev ? { ...prev, synthesis: finalSynthesis } : null);
                }
            }
            
            const completeReport = { ...(finalReport!), synthesis: finalSynthesis };
            setReport(completeReport);
            setReportStatus('done');
            
            if (settings.defaults.autoSaveReports) {
                await saveReport(data, completeReport);
                setIsCurrentReportSaved(true);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred during report generation.');
            setReportStatus('error');
        }
    }, [settings.ai, settings.defaults.autoSaveReports, setCurrentView, saveReport]);

    const handleSaveReport = useCallback(async () => {
        if (report && localResearchInput) {
            await saveReport(localResearchInput, report);
            setIsCurrentReportSaved(true);
        }
    }, [report, localResearchInput, saveReport]);
    
    const handleNewSearch = useCallback(() => {
        setReport(null);
        setResearchInput(null);
        setLocalResearchInput(null);
        setReportStatus('idle');
        setError(null);
        setIsCurrentReportSaved(false);
        setCurrentView('orchestrator');
    }, [setCurrentView]);

    const handleTagsUpdate = useCallback(async (pmid: string, newTags: string[]) => {
        // This is a complex operation that needs to update the central knowledge base.
        // For now, we update the local report state for immediate UI feedback.
        // The persistence is handled by the KnowledgeBaseContext.
        setReport(prevReport => {
            if (!prevReport || !prevReport.rankedArticles.some(a => a.pmid === pmid)) {
                return prevReport;
            }
            return {
                ...prevReport,
                rankedArticles: prevReport.rankedArticles.map(a => 
                    a.pmid === pmid ? { ...a, customTags: newTags } : a
                )
            };
        });
    }, []);

    const onPrefillConsumed = useCallback(() => {
        setPrefilledTopic(null);
      }, []);

    return {
        researchInput,
        localResearchInput,
        setLocalResearchInput,
        report,
        reportStatus,
        error,
        currentPhase,
        isCurrentReportSaved,
        prefilledTopic,
        setPrefilledTopic,
        handleFormSubmit,
        handleSaveReport,
        handleNewSearch,
        handleTagsUpdate,
        onPrefillConsumed
    };
};
