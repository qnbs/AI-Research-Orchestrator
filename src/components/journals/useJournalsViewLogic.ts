import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { useKnowledgeBase } from '../../contexts/KnowledgeBaseContext';
import { useUI } from '../../contexts/UIContext';
import {
  findArticlesInJournal,
  generateJournalProfileAnalysis,
} from '../../services/journalService';
import { JournalProfile, Article } from '../../types';
import { useGetFeaturedJournalsQuery, type FeaturedJournal } from '../../store/slices/apiSlice';

export type { FeaturedJournal };

export const useJournalsViewLogic = () => {
  const [journalName, setJournalName] = useState('');
  const [topic, setTopic] = useState('');
  const [onlyOa, setOnlyOa] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [journalProfile, setJournalProfile] = useState<JournalProfile | null>(null);
  const [foundArticles, setFoundArticles] = useState<Article[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { settings } = useSettings();
  const { saveJournalProfile } = useKnowledgeBase();
  const { setNotification } = useUI();

  // RTK Query — replaces manual fetch + useState for featured journals
  const { data: featuredJournals = [] } = useGetFeaturedJournalsQuery();

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleAnalyzeJournal = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!journalName.trim()) {
        setNotification({
          id: Date.now(),
          message: 'Please provide a journal name.',
          type: 'error',
        });
        return;
      }

      setIsLoading(true);
      setError(null);
      setJournalProfile(null);
      setFoundArticles(null);

      try {
        const [profile, articles] = await Promise.all([
          generateJournalProfileAnalysis(journalName, settings.ai),
          findArticlesInJournal(journalName, topic, onlyOa),
        ]);

        if (isMounted.current) {
          setJournalProfile(profile);
          setFoundArticles(articles);
        }
        await saveJournalProfile(profile, articles);
      } catch (err) {
        if (isMounted.current) {
          const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
          setError(errorMessage);
          setNotification({ id: Date.now(), message: errorMessage, type: 'error' });
        }
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    },
    [journalName, topic, onlyOa, settings.ai, saveJournalProfile, setNotification],
  );

  const handleFeaturedSelect = useCallback((name: string) => {
    setJournalName(name);
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
    journalName,
    setJournalName,
    topic,
    setTopic,
    onlyOa,
    setOnlyOa,
    isLoading,
    journalProfile,
    foundArticles,
    error,
    featuredJournals,
    analyticsData,
    handleAnalyzeJournal,
    handleFeaturedSelect,
    settings,
  };
};
