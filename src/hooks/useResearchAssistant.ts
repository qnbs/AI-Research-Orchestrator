import { useState, useCallback, useEffect, useRef } from 'react';
import { ResearchAnalysis, SimilarArticle, OnlineFindings, Settings } from '../types';
import type { View } from '../contexts/UIContext';
import {
  useLazyGenerateAnalysisQuery,
  useLazyFindSimilarArticlesQuery,
  useLazyFindRelatedOnlineQuery,
} from '../store/slices/geminiApiSlice';
import { RESEARCH_PHASE_ANALYZING } from '../i18n/researchViewTranslations';

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

function settledErrorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : 'An unknown error occurred.';
}

function mapSimilarSettled(result: PromiseSettledResult<SimilarArticle[] | null>): {
  loading: false;
  articles: SimilarArticle[] | null;
  error: string | null;
} {
  if (result.status === 'fulfilled') {
    return { loading: false, articles: result.value, error: null };
  }
  return { loading: false, articles: null, error: settledErrorMessage(result.reason) };
}

function mapOnlineSettled(result: PromiseSettledResult<OnlineFindings | null>): {
  loading: false;
  findings: OnlineFindings | null;
  error: string | null;
} {
  if (result.status === 'fulfilled') {
    return { loading: false, findings: result.value, error: null };
  }
  return { loading: false, findings: null, error: settledErrorMessage(result.reason) };
}

/**
 * Rapid Research Assistant state machine: analysis + optional similar/online fetches
 * via lazy RTK Query endpoints. In-flight triggers are aborted on unmount / clear /
 * a new startResearch call. An operation generation ignores superseded workflows so
 * late results cannot overwrite newer state.
 */
export const useResearchAssistant = (
  aiSettings: Settings['ai'],
  setCurrentView: (view: View) => void,
) => {
  const [state, setState] = useState<ResearchState>(initialState);
  const isMountedRef = useRef(true);
  const inflightRef = useRef<AbortablePromise[]>([]);
  const operationGenerationRef = useRef(0);

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

  const bumpGeneration = useCallback(() => {
    operationGenerationRef.current += 1;
    return operationGenerationRef.current;
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      bumpGeneration();
      abortInflight();
    };
  }, [abortInflight, bumpGeneration]);

  const startResearch = useCallback(
    async (queryText: string) => {
      if (!queryText.trim()) return;

      abortInflight();
      const generation = bumpGeneration();

      setState({
        ...initialState,
        isLoading: true,
        phase: RESEARCH_PHASE_ANALYZING,
      });
      setCurrentView('research');

      const isCurrent = () => isMountedRef.current && generation === operationGenerationRef.current;

      try {
        const analysisPromise = triggerAnalysis({ query: queryText, aiSettings });
        inflightRef.current.push(analysisPromise);
        const analysisResult = await analysisPromise.unwrap();

        if (!isCurrent()) return;

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

        if (!isCurrent()) return;

        setState((s) => ({
          ...s,
          similar: mapSimilarSettled(similarResult),
          online: mapOnlineSettled(onlineResult),
        }));
        if (isCurrent()) {
          inflightRef.current = [];
        }
      } catch (err) {
        if (!isCurrent()) return;
        // Aborted requests should not surface as user-visible errors
        const message = settledErrorMessage(err);
        if (/abort/i.test(message)) return;
        setState((s) => ({
          ...s,
          isLoading: false,
          phase: '',
          error: message,
        }));
      }
    },
    [
      aiSettings,
      setCurrentView,
      triggerAnalysis,
      triggerSimilar,
      triggerOnline,
      abortInflight,
      bumpGeneration,
    ],
  );

  const clearResearch = useCallback(() => {
    bumpGeneration();
    abortInflight();
    setState(initialState);
  }, [abortInflight, bumpGeneration]);

  return {
    ...state,
    startResearch,
    clearResearch,
  };
};
