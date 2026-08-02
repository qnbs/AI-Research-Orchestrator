import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { AuthorCluster, AuthorProfile, RankedArticle } from '../../types';
import { useSettings } from '../../contexts/SettingsContext';
import { useKnowledgeBase } from '../../contexts/KnowledgeBaseContext';
import { useTranslation } from '../../hooks/useTranslation';
import type { TranslationKey } from '../../hooks/useTranslation';
import {
  disambiguateAuthor,
  generateAuthorQuery,
  generateAuthorProfileAnalysis,
  suggestAuthors,
} from '../../services/geminiService';
import {
  useLazySearchPubMedIdsQuery,
  useLazyGetArticleDetailsFullQuery,
  useGetFeaturedAuthorsQuery,
} from '../../store/slices/apiSlice';
import { safeLogError } from '../../lib/safeLog';
import { buildAuthorMetricsFromCorpus } from '../../lib/authorIdentity';

const authorPhaseKeys = [
  'authors.phase.search',
  'authors.phase.details',
  'authors.phase.disambiguate',
  'authors.phase.cluster_details',
  'authors.phase.analysis',
  'authors.phase.finalize',
] as const satisfies readonly TranslationKey[];

const authorPhaseDetailKeys: Record<(typeof authorPhaseKeys)[number], TranslationKey[]> = {
  'authors.phase.search': ['authors.phase.search.d1', 'authors.phase.search.d2'],
  'authors.phase.details': ['authors.phase.details.d1', 'authors.phase.details.d2'],
  'authors.phase.disambiguate': [
    'authors.phase.disambiguate.d1',
    'authors.phase.disambiguate.d2',
    'authors.phase.disambiguate.d3',
  ],
  'authors.phase.cluster_details': ['authors.phase.cluster_details.d1'],
  'authors.phase.analysis': [
    'authors.phase.analysis.d1',
    'authors.phase.analysis.d2',
    'authors.phase.analysis.d3',
  ],
  'authors.phase.finalize': ['authors.phase.finalize.d1', 'authors.phase.finalize.d2'],
};

export const useAuthorsViewLogic = (
  initialProfile: AuthorProfile | null,
  onViewedInitialProfile: () => void,
) => {
  const { settings } = useSettings();
  const { saveAuthorProfile } = useKnowledgeBase();
  const { t } = useTranslation();
  const [view, setView] = useState<'landing' | 'disambiguation' | 'profile'>('landing');
  const [authorQuery, setAuthorQuery] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [authorClusters, setAuthorClusters] = useState<AuthorCluster[] | null>(null);
  const [authorProfile, setAuthorProfile] = useState<AuthorProfile | null>(null);

  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [suggestedAuthors, setSuggestedAuthors] = useState<
    { name: string; description: string }[] | null
  >(null);

  const authorLoadingPhases = useMemo(() => authorPhaseKeys.map((k) => t(k)), [t]);

  const authorPhaseDetails = useMemo(() => {
    const details: Record<string, string[]> = {};
    authorPhaseKeys.forEach((phaseKey) => {
      details[t(phaseKey)] = authorPhaseDetailKeys[phaseKey].map((dk) => t(dk));
    });
    return details;
  }, [t]);

  // ── RTK Query hooks ──────────────────────────────────────────────────────
  const {
    data: featuredCategories = [],
    isLoading: isFeaturedLoading,
    error: featuredQueryError,
  } = useGetFeaturedAuthorsQuery();
  const featuredError = featuredQueryError ? t('authors.featured.error') : null;

  const [triggerSearchIds] = useLazySearchPubMedIdsQuery();
  const [triggerGetDetails] = useLazyGetArticleDetailsFullQuery();

  const isMounted = useRef(true);
  const profileAbortRef = useRef<AbortController | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  const beginProfileRequest = useCallback(() => {
    profileAbortRef.current?.abort();
    const controller = new AbortController();
    profileAbortRef.current = controller;
    return controller.signal;
  }, []);

  const beginSearchRequest = useCallback(() => {
    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    return controller.signal;
  }, []);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      profileAbortRef.current?.abort();
      searchAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (initialProfile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- consumes an external one-shot "restore this profile" signal, acknowledging via onViewedInitialProfile.
      setAuthorProfile(initialProfile);
      setView('profile');
      onViewedInitialProfile();
    }
  }, [initialProfile, onViewedInitialProfile]);

  const handleSelectCluster = useCallback(
    async (cluster: AuthorCluster) => {
      const signal = beginProfileRequest();
      setIsLoading(true);
      setError(null);
      setView('landing');

      try {
        setLoadingPhase(authorLoadingPhases[3]);
        const allArticleDetails = await triggerGetDetails({ pmids: cluster.pmids }).unwrap();

        if (!isMounted.current || signal.aborted) return;

        setLoadingPhase(authorLoadingPhases[4]);
        const { careerSummary, coreConcepts } = await generateAuthorProfileAnalysis(
          cluster.nameVariant,
          allArticleDetails,
          settings.ai,
          signal,
        );

        if (!isMounted.current || signal.aborted) return;

        setLoadingPhase(authorLoadingPhases[5]);
        const metrics = buildAuthorMetricsFromCorpus(
          allArticleDetails,
          cluster.nameVariant,
          cluster.publicationCount,
        );

        const profile: AuthorProfile = {
          name: cluster.nameVariant,
          affiliations: [cluster.primaryAffiliation],
          metrics,
          careerSummary,
          coreConcepts,
          publications: allArticleDetails as RankedArticle[],
        };

        await saveAuthorProfile({ authorName: profile.name }, profile);

        if (isMounted.current && !signal.aborted) {
          setAuthorProfile(profile);
          setView('profile');
        }
      } catch (err) {
        if (signal.aborted) return;
        safeLogError('Failed to build author profile', err);
        if (isMounted.current) {
          setError(t('authors.error.profile_build'));
          setView('landing');
        }
      } finally {
        if (isMounted.current && !signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    [
      settings.ai,
      saveAuthorProfile,
      triggerGetDetails,
      authorLoadingPhases,
      t,
      beginProfileRequest,
    ],
  );

  const handleSearch = useCallback(
    async (name: string) => {
      const signal = beginSearchRequest();
      profileAbortRef.current?.abort();
      setIsLoading(true);
      setError(null);
      setAuthorQuery(name);
      setAuthorClusters(null);
      setAuthorProfile(null);
      setSuggestedAuthors(null);

      try {
        setLoadingPhase(authorLoadingPhases[0]);
        const authorQueryString = generateAuthorQuery(name);
        const pmids = await triggerSearchIds({
          query: authorQueryString,
          maxResults: settings.ai.researchAssistant.authorSearchLimit,
        }).unwrap();
        if (pmids.length === 0) {
          if (isMounted.current && !signal.aborted) {
            setError(t('authors.error.no_publications'));
            setView('landing');
          }
          return;
        }

        if (!isMounted.current || signal.aborted) return;

        setLoadingPhase(authorLoadingPhases[1]);
        const articleDetails = await triggerGetDetails({ pmids: pmids.slice(0, 50) }).unwrap();

        if (!isMounted.current || signal.aborted) return;

        setLoadingPhase(authorLoadingPhases[2]);
        const clusters = await disambiguateAuthor(name, articleDetails, settings.ai, signal);

        if (!isMounted.current || signal.aborted) return;

        if (clusters.length === 1) {
          await handleSelectCluster(clusters[0]);
        } else {
          setAuthorClusters(clusters);
          setView('disambiguation');
        }
      } catch (err) {
        if (signal.aborted) return;
        safeLogError('Failed to search author profile', err);
        if (isMounted.current) {
          setError(t('authors.error.generic'));
          setView('landing');
        }
      } finally {
        if (isMounted.current && !signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    [
      settings.ai,
      handleSelectCluster,
      triggerSearchIds,
      triggerGetDetails,
      authorLoadingPhases,
      t,
      beginSearchRequest,
    ],
  );

  const handleSuggestAuthors = useCallback(
    async (field: string) => {
      setIsSuggesting(true);
      setSuggestionError(null);
      setSuggestedAuthors(null);
      setError(null);
      try {
        const result = await suggestAuthors(field, settings.ai);
        if (isMounted.current) {
          setSuggestedAuthors(result);
        }
      } catch (err) {
        safeLogError('Failed to suggest authors', err);
        if (isMounted.current) {
          setSuggestionError(t('authors.error.suggest'));
        }
      } finally {
        if (isMounted.current) {
          setIsSuggesting(false);
        }
      }
    },
    [settings.ai, t],
  );

  const handleReset = useCallback(() => {
    setView('landing');
    setAuthorQuery('');
    setError(null);
    setAuthorClusters(null);
    setAuthorProfile(null);
  }, []);

  return {
    view,
    authorQuery,
    isLoading,
    loadingPhase,
    error,
    authorClusters,
    authorProfile,
    isSuggesting,
    suggestionError,
    suggestedAuthors,
    featuredCategories,
    isFeaturedLoading,
    featuredError,
    handleSearch,
    handleSelectCluster,
    handleSuggestAuthors,
    handleReset,
    authorLoadingPhases,
    authorPhaseDetails,
  };
};
