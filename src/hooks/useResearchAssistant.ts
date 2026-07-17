import { useState, useCallback, useEffect, useRef } from 'react';
import { ResearchAnalysis, SimilarArticle, OnlineFindings, Settings } from '../types';
import type { View } from '../contexts/UIContext';
import {
  useLazyGenerateAnalysisQuery,
  useLazyFindSimilarArticlesQuery,
  useLazyFindRelatedOnlineQuery,
} from '../store/slices/geminiApiSlice';

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

type AbortablePromise = { abort: () => void };

/**
 * Rapid Research Assistant state machine: analysis + optional similar/online fetches
 * via lazy RTK Query endpoints. In-flight triggers are aborted on unmount / clear /
 * a new startResearch call; late results are also ignored via `isMountedRef`.
 */
export const useResearchAssistant = (
  aiSettings: Settings['ai'],
  setCurrentView: (view: View) => void,
) => {
  const [state, setState] = useState<ResearchState>(initialState);
  const isMountedRef = useRef(true);
  const inflightRef = useRef<AbortablePromise[]>([]);

  const [triggerAnalysis] = useLazyGenerateAnalysisQuery();
  const [triggerSimilar] = useLazyFindSimilarArticlesQuery();
  const [triggerOnline] = useLazyFindRelatedOnlineQuery();

  const abortInflight = useCallback(() => {
    for (const req of inflightRef.current) {
      try {
        req.abort();
      } catch {
        // ignore abort errors from already-settled requests
      }
    }
    inflightRef.current = [];
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      abortInflight();
    };
  }, [abortInflight]);

  const startResearch = useCallback(
    async (queryText: string) => {
      if (!queryText.trim()) return;

      abortInflight();

      setState({
        ...initialState,
        isLoading: true,
        phase: 'Analyzing input and generating summary...',
      });
      setCurrentView('research');

      try {
        const analysisPromise = triggerAnalysis({ query: queryText, aiSettings });
        inflightRef.current.push(analysisPromise);
        const analysisResult = await analysisPromise.unwrap();

        if (!isMountedRef.current) return;

        setState((s) => ({
          ...s,
          isLoading: false,
          phase: '',
          analysis: analysisResult,
          similar: { ...s.similar, loading: aiSettings.researchAssistant.autoFetchSimilar },
          online: { ...s.online, loading: aiSettings.researchAssistant.autoFetchOnline },
        }));

        const similarPromise = aiSettings.researchAssistant.autoFetchSimilar
          ? triggerSimilar({
              article: { title: analysisResult.synthesizedTopic, summary: analysisResult.summary },
              aiSettings,
            })
          : null;
        const onlinePromise = aiSettings.researchAssistant.autoFetchOnline
          ? triggerOnline({ topic: analysisResult.synthesizedTopic, aiSettings })
          : null;

        if (similarPromise) inflightRef.current.push(similarPromise);
        if (onlinePromise) inflightRef.current.push(onlinePromise);

        const [similarResult, onlineResult] = await Promise.allSettled([
          similarPromise ? similarPromise.unwrap() : Promise.resolve(null),
          onlinePromise ? onlinePromise.unwrap() : Promise.resolve(null),
        ]);

        if (!isMountedRef.current) return;

        setState((s) => ({
          ...s,
          similar: {
            loading: false,
            articles:
              similarResult.status === 'fulfilled'
                ? (similarResult.value as SimilarArticle[] | null)
                : null,
            error:
              similarResult.status === 'rejected' ? (similarResult.reason as Error).message : null,
          },
          online: {
            loading: false,
            findings:
              onlineResult.status === 'fulfilled'
                ? (onlineResult.value as OnlineFindings | null)
                : null,
            error:
              onlineResult.status === 'rejected' ? (onlineResult.reason as Error).message : null,
          },
        }));
        inflightRef.current = [];
      } catch (err) {
        if (!isMountedRef.current) return;
        // Aborted requests should not surface as user-visible errors
        const message = err instanceof Error ? err.message : 'An unknown error occurred.';
        if (/abort/i.test(message)) return;
        setState((s) => ({
          ...s,
          isLoading: false,
          phase: '',
          error: message,
        }));
      }
    },
    [aiSettings, setCurrentView, triggerAnalysis, triggerSimilar, triggerOnline, abortInflight],
  );

  const clearResearch = useCallback(() => {
    abortInflight();
    setState(initialState);
  }, [abortInflight]);

  return {
    ...state,
    startResearch,
    clearResearch,
  };
};
