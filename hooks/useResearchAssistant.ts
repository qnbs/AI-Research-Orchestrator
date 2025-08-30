import { useState, useCallback } from 'react';
import { generateResearchAnalysis, findSimilarArticles, findRelatedOnline } from '../services/geminiService';
import type { ResearchAnalysis, SimilarArticle, OnlineFindings, Settings } from '../types';
import type { View } from '../contexts/UIContext';

interface ResearchState {
    isLoading: boolean;
    phase: string;
    error: string | null;
    analysis: ResearchAnalysis | null;
    similar: {
        loading: boolean;
        error: string | null;
        articles: SimilarArticle[] | null;
    };
    online: {
        loading: boolean;
        error: string | null;
        findings: OnlineFindings | null;
    };
}

const initialState: ResearchState = {
    isLoading: false,
    phase: '',
    error: null,
    analysis: null,
    similar: { loading: false, error: null, articles: null },
    online: { loading: false, error: null, findings: null },
};

export const useResearchAssistant = (
    aiSettings: Settings['ai'],
    setCurrentView: (view: View) => void
) => {
    const [state, setState] = useState<ResearchState>(initialState);

    const startResearch = useCallback(async (queryText: string) => {
        if (!queryText.trim()) return;

        setState({
            ...initialState,
            isLoading: true,
            phase: 'Analyzing input and generating summary...',
        });
        setCurrentView('research');

        try {
            const analysisResult = await generateResearchAnalysis(queryText, aiSettings);
            setState(s => ({
                ...s,
                isLoading: false,
                phase: '',
                analysis: analysisResult,
                similar: { ...s.similar, loading: aiSettings.researchAssistant.autoFetchSimilar },
                online: { ...s.online, loading: aiSettings.researchAssistant.autoFetchOnline },
            }));

            // Fetch similar articles and online findings in parallel, based on settings
            const fetchPromises = [];

            if (aiSettings.researchAssistant.autoFetchSimilar) {
                fetchPromises.push(findSimilarArticles({ title: analysisResult.synthesizedTopic, summary: analysisResult.summary }, aiSettings));
            } else {
                fetchPromises.push(Promise.resolve(null)); // Push a resolved null to keep array indices consistent
            }

            if (aiSettings.researchAssistant.autoFetchOnline) {
                fetchPromises.push(findRelatedOnline(analysisResult.synthesizedTopic, aiSettings));
            } else {
                fetchPromises.push(Promise.resolve(null));
            }

            Promise.allSettled(fetchPromises).then(([similarResult, onlineResult]) => {
                setState(s => ({
                    ...s,
                    similar: {
                        loading: false,
                        articles: similarResult.status === 'fulfilled' ? similarResult.value : null,
                        error: similarResult.status === 'rejected' ? (similarResult.reason as Error).message : null,
                    },
                    online: {
                        loading: false,
                        findings: onlineResult.status === 'fulfilled' ? onlineResult.value : null,
                        error: onlineResult.status === 'rejected' ? (onlineResult.reason as Error).message : null,
                    }
                }));
            });

        } catch (err) {
            setState(s => ({
                ...s,
                isLoading: false,
                phase: '',
                error: err instanceof Error ? err.message : 'An unknown error occurred.',
            }));
        }
    }, [aiSettings, setCurrentView]);

    const clearResearch = useCallback(() => {
        setState(initialState);
    }, []);

    return {
        ...state,
        startResearch,
        clearResearch,
    };
};