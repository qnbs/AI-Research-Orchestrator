
import { useState, useCallback, useEffect, useRef } from 'react';
import { ResearchAnalysis, SimilarArticle, OnlineFindings, Settings } from '../types';
import type { View } from '../contexts/UIContext';
import { useLazyGenerateAnalysisQuery, useLazyFindSimilarArticlesQuery, useLazyFindRelatedOnlineQuery } from '../store/slices/geminiApiSlice';

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
    const isMountedRef = useRef(true);

    const [triggerAnalysis] = useLazyGenerateAnalysisQuery();
    const [triggerSimilar] = useLazyFindSimilarArticlesQuery();
    const [triggerOnline] = useLazyFindRelatedOnlineQuery();

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const startResearch = useCallback(async (queryText: string) => {
        if (!queryText.trim()) return;

        setState({
            ...initialState,
            isLoading: true,
            phase: 'Analyzing input and generating summary...',
        });
        setCurrentView('research');

        try {
            const analysisResult = await triggerAnalysis({ query: queryText, aiSettings }).unwrap();
            
            if (!isMountedRef.current) return;

            setState(s => ({
                ...s,
                isLoading: false,
                phase: '',
                analysis: analysisResult,
                similar: { ...s.similar, loading: aiSettings.researchAssistant.autoFetchSimilar },
                online: { ...s.online, loading: aiSettings.researchAssistant.autoFetchOnline },
            }));

            // Fetch similar articles and online findings in parallel, based on settings
            const fetchPromises: Promise<SimilarArticle[] | OnlineFindings | null>[] = [];

            if (aiSettings.researchAssistant.autoFetchSimilar) {
                fetchPromises.push(
                    triggerSimilar({
                        article: { title: analysisResult.synthesizedTopic, summary: analysisResult.summary },
                        aiSettings,
                    }).unwrap()
                );
            } else {
                fetchPromises.push(Promise.resolve(null));
            }

            if (aiSettings.researchAssistant.autoFetchOnline) {
                fetchPromises.push(
                    triggerOnline({ topic: analysisResult.synthesizedTopic, aiSettings }).unwrap()
                );
            } else {
                fetchPromises.push(Promise.resolve(null));
            }

            Promise.allSettled(fetchPromises).then(([similarResult, onlineResult]) => {
                if (!isMountedRef.current) return;

                setState(s => ({
                    ...s,
                    similar: {
                        loading: false,
                        articles: similarResult.status === 'fulfilled' ? (similarResult.value as SimilarArticle[] | null) : null,
                        error: similarResult.status === 'rejected' ? (similarResult.reason as Error).message : null,
                    },
                    online: {
                        loading: false,
                        findings: onlineResult.status === 'fulfilled' ? (onlineResult.value as OnlineFindings | null) : null,
                        error: onlineResult.status === 'rejected' ? (onlineResult.reason as Error).message : null,
                    }
                }));
            });

        } catch (err) {
            if (!isMountedRef.current) return;
            setState(s => ({
                ...s,
                isLoading: false,
                phase: '',
                error: err instanceof Error ? err.message : 'An unknown error occurred.',
            }));
        }
    }, [aiSettings, setCurrentView, triggerAnalysis, triggerSimilar, triggerOnline]);

    const clearResearch = useCallback(() => {
        setState(initialState);
    }, []);

    return {
        ...state,
        startResearch,
        clearResearch,
    };
};
