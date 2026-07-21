import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { useKnowledgeBase } from '../../contexts/KnowledgeBaseContext';
import { useUI } from '../../contexts/UIContext';
import { useTranslation } from '../../hooks/useTranslation';
import {
  disambiguateJournal,
  findArticlesInJournal,
  generateJournalProfileAnalysis,
  suggestJournals,
} from '../../services/journalService';
import { Article, JournalCandidate, JournalProfile } from '../../types';
import { useGetFeaturedJournalsQuery } from '../../store/slices/apiSlice';
import type { TranslationKey } from '../../hooks/useTranslation';

const journalPhaseKeys = [
  'journals.phase.disambiguate',
  'journals.phase.articles',
  'journals.phase.profile',
  'journals.phase.finalize',
] as const;

const journalPhaseDetailKeys: Record<(typeof journalPhaseKeys)[number], TranslationKey[]> = {
  'journals.phase.disambiguate': [
    'journals.phase.disambiguate.d1',
    'journals.phase.disambiguate.d2',
  ],
  'journals.phase.articles': ['journals.phase.articles.d1', 'journals.phase.articles.d2'],
  'journals.phase.profile': ['journals.phase.profile.d1', 'journals.phase.profile.d2'],
  'journals.phase.finalize': ['journals.phase.finalize.d1'],
};

export type JournalsViewState = 'landing' | 'disambiguation' | 'profile';

export interface InitialJournalEntry {
  profile: JournalProfile;
  articles: Article[];
}

export interface InitialJournalQuery {
  initialQuery: string | null;
  onInitialQueryConsumed: () => void;
}

export const useJournalsViewLogic = (
  initialEntry: InitialJournalEntry | null,
  onViewedInitialEntry: () => void,
  queryPrefill?: InitialJournalQuery,
) => {
  const [view, setView] = useState<JournalsViewState>('landing');
  const [journalName, setJournalName] = useState('');
  const [topic, setTopic] = useState('');
  const [onlyOa, setOnlyOa] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState('');
  const [journalProfile, setJournalProfile] = useState<JournalProfile | null>(null);
  const [foundArticles, setFoundArticles] = useState<Article[] | null>(null);
  const [candidates, setCandidates] = useState<JournalCandidate[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [suggestedJournals, setSuggestedJournals] = useState<
    { name: string; description: string }[] | null
  >(null);

  const { settings } = useSettings();
  const { saveJournalProfile } = useKnowledgeBase();
  const { setNotification } = useUI();
  const { t } = useTranslation();

  // RTK Query — categorized featured journals (static JSON)
  const {
    data: featuredCategories = [],
    isLoading: isFeaturedLoading,
    error: featuredQueryError,
  } = useGetFeaturedJournalsQuery();

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Restore a saved KB journal entry into the profile view.
  useEffect(() => {
    if (initialEntry) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- consumes an external one-shot "restore this entry" signal, acknowledging via onViewedInitialEntry.
      setJournalProfile(initialEntry.profile);
      setFoundArticles(initialEntry.articles);
      setJournalName(initialEntry.profile.name);
      setView('profile');
      onViewedInitialEntry();
    }
  }, [initialEntry, onViewedInitialEntry]);

  // Prefill cross-link: a journal name handed over from another view (e.g. KB detail panel).
  const [prefillQuery, setPrefillQuery] = useState<string | null>(null);
  useEffect(() => {
    if (queryPrefill?.initialQuery) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- consumes an external one-shot prefill signal, acknowledging via onInitialQueryConsumed.
      setPrefillQuery(queryPrefill.initialQuery);
      queryPrefill.onInitialQueryConsumed();
    }
  }, [queryPrefill]);

  const journalLoadingPhases = useMemo(
    () => journalPhaseKeys.map((k) => t(k as TranslationKey)),
    [t],
  );

  const journalPhaseDetails = useMemo(() => {
    const details: Record<string, string[]> = {};
    journalPhaseKeys.forEach((phaseKey) => {
      details[t(phaseKey as TranslationKey)] = journalPhaseDetailKeys[phaseKey].map((dk) => t(dk));
    });
    return details;
  }, [t]);

  /**
   * Core analysis pipeline: fetch recent articles, then generate the profile
   * grounded on those articles (fixes the previous empty-articles heuristic path).
   */
  const runAnalysis = useCallback(
    async (name: string) => {
      setLoadingPhase(t('journals.phase.articles'));
      let articles: Article[] = [];
      try {
        articles = await findArticlesInJournal(name, topic, onlyOa);
      } catch (fetchError) {
        // PubMed may be unreachable (offline / rate limit) — the profile still
        // works with curated or AI-estimated data, so degrade gracefully.
        console.warn('Journal article fetch failed, continuing without articles:', fetchError);
      }

      if (!isMounted.current) return;

      setLoadingPhase(t('journals.phase.profile'));
      const profile = await generateJournalProfileAnalysis(name, settings.ai, undefined, articles);

      if (!isMounted.current) return;

      setLoadingPhase(t('journals.phase.finalize'));
      setJournalProfile(profile);
      setFoundArticles(articles);
      setView('profile');
      await saveJournalProfile(profile, articles);
    },
    [topic, onlyOa, settings.ai, saveJournalProfile, t],
  );

  /** Step 1: disambiguate the entered journal name, then analyze or ask. */
  const handleSearch = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) {
        setNotification({ id: Date.now(), message: t('journals.error.no_name'), type: 'error' });
        return;
      }

      setIsLoading(true);
      setError(null);
      setSuggestionError(null);
      setJournalProfile(null);
      setFoundArticles(null);
      setCandidates(null);
      setSuggestedJournals(null);
      setJournalName(trimmed);

      try {
        setLoadingPhase(t('journals.phase.disambiguate'));
        const found = await disambiguateJournal(trimmed, settings.ai);

        if (!isMounted.current) return;

        if (found.length > 1) {
          setCandidates(found);
          setView('disambiguation');
        } else {
          // Exactly one confident candidate (or none — unknown journal): analyze directly.
          await runAnalysis(found.length === 1 ? found[0].name : trimmed);
        }
      } catch (err) {
        if (isMounted.current) {
          const errorMessage = t('journals.error.generic');
          setError(errorMessage);
          setNotification({ id: Date.now(), message: errorMessage, type: 'error' });
          setView('landing');
        }
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    },
    [settings.ai, runAnalysis, setNotification, t],
  );

  /** Step 2 (after disambiguation): user picked a candidate. */
  const handleSelectCandidate = useCallback(
    async (candidate: JournalCandidate) => {
      setIsLoading(true);
      setError(null);
      setCandidates(null);
      setJournalName(candidate.name);
      try {
        await runAnalysis(candidate.name);
      } catch (err) {
        if (isMounted.current) {
          const errorMessage = t('journals.error.generic');
          setError(errorMessage);
          setNotification({ id: Date.now(), message: errorMessage, type: 'error' });
          setView('landing');
        }
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    },
    [runAnalysis, setNotification, t],
  );

  /** Featured/suggested card click: run the full pipeline immediately. */
  const handleFeaturedSelect = useCallback(
    (name: string) => {
      void handleSearch(name);
    },
    [handleSearch],
  );

  // Fire a pending cross-link prefill exactly once handleSearch is available.
  useEffect(() => {
    if (prefillQuery) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clears the consumed-once prefill guard before firing the async search it triggers.
      setPrefillQuery(null);
      void handleSearch(prefillQuery);
    }
  }, [prefillQuery, handleSearch]);

  const handleSuggestJournals = useCallback(
    async (field: string) => {
      setIsSuggesting(true);
      setSuggestionError(null);
      setSuggestedJournals(null);
      setError(null);
      try {
        const result = await suggestJournals(field, settings.ai);
        if (isMounted.current) {
          setSuggestedJournals(result);
        }
      } catch (err) {
        if (isMounted.current) {
          setSuggestionError(t('journals.error.generic'));
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
    setError(null);
    setCandidates(null);
    setJournalProfile(null);
    setFoundArticles(null);
    setSuggestedJournals(null);
    setSuggestionError(null);
    setIsSuggesting(false);
  }, []);

  const analyticsData = useMemo(() => {
    if (!foundArticles || foundArticles.length === 0) return null;

    const stopWords = new Set([
      'the',
      'and',
      'of',
      'in',
      'a',
      'for',
      'to',
      'with',
      'on',
      'at',
      'by',
      'an',
      'is',
      'from',
      'as',
      'effect',
      'effects',
      'analysis',
      'study',
      'review',
      'patient',
      'patients',
      'using',
      'during',
      'after',
      'based',
      'treatment',
      'clinical',
    ]);
    const wordCounts: Record<string, number> = {};

    foundArticles.forEach((a) => {
      const words = a.title
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/);
      words.forEach((w) => {
        if (w.length > 4 && !stopWords.has(w)) {
          wordCounts[w] = (wordCounts[w] || 0) + 1;
        }
      });
    });

    const topTopics = Object.entries(wordCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6);

    const topicData = topTopics.map(([name, value]) => ({ name, value }));

    const years: Record<string, number> = {};
    foundArticles.forEach((a) => {
      if (a.pubYear) {
        years[a.pubYear] = (years[a.pubYear] || 0) + 1;
      }
    });
    const timelineData = Object.keys(years)
      .sort()
      .map((year) => ({ year, count: years[year] }));

    return { topicData, timelineData };
  }, [foundArticles]);

  return {
    view,
    journalName,
    setJournalName,
    topic,
    setTopic,
    onlyOa,
    setOnlyOa,
    isLoading,
    loadingPhase,
    journalProfile,
    foundArticles,
    candidates,
    error,
    isSuggesting,
    suggestionError,
    suggestedJournals,
    featuredCategories,
    isFeaturedLoading,
    featuredError: featuredQueryError ? t('journals.featured.error') : null,
    analyticsData,
    handleSearch,
    handleSelectCandidate,
    handleFeaturedSelect,
    handleSuggestJournals,
    handleReset,
    journalLoadingPhases,
    journalPhaseDetails,
    settings,
  };
};

export type JournalsViewLogic = ReturnType<typeof useJournalsViewLogic>;
