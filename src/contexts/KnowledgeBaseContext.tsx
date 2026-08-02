import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import {
  KnowledgeBaseEntry,
  ResearchInput,
  ResearchReport,
  RankedArticle,
  AggregatedArticle,
  AuthorProfile,
  AuthorProfileInput,
  ResearchEntry,
  AuthorProfileEntry,
  JournalProfile,
  JournalEntry,
  Article,
} from '../types';
import { deleteEntries as deleteEntriesFromDb } from '../services/databaseService';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setNotification } from '../store/slices/uiSlice';
import {
  fetchKnowledgeBase,
  addKbEntry,
  importKbEntries,
  clearKb,
  selectUniqueArticles,
  selectAllEntries,
  updateKbEntry,
  bulkUpdateKbEntries,
} from '../store/slices/knowledgeBaseSlice';
import { isDemoEntryId, DEMO_DISMISS_STORAGE_KEY } from '../services/nonAi';
import { markDemoSeedConsumed, useDemoKnowledgeBaseSeed } from '../hooks/useDemoKnowledgeBaseSeed';
import { useTranslation } from '../hooks/useTranslation';
import {
  buildHarmonizeDuplicateUpdates,
  buildResearchPrunePlan,
  countDuplicateArticleGroups,
} from '../lib/knowledgeBaseDedup';

interface KnowledgeBaseContextType {
  knowledgeBase: KnowledgeBaseEntry[];
  uniqueArticles: AggregatedArticle[];
  getArticles: (sourceType?: 'all' | 'research' | 'author' | 'journal') => AggregatedArticle[];
  getRecentResearchEntries: (count: number) => ResearchEntry[];
  saveReport: (researchInput: ResearchInput, report: ResearchReport) => Promise<void>;
  saveAuthorProfile: (input: AuthorProfileInput, profile: AuthorProfile) => Promise<void>;
  saveJournalProfile: (profile: JournalProfile, articles: Article[]) => Promise<void>;
  clearKnowledgeBase: () => Promise<void>;
  clearDemoData: () => Promise<void>;
  updateEntryTitle: (id: string, newTitle: string) => Promise<void>;
  updateTags: (pmid: string, newTags: string[]) => Promise<void>;
  deleteArticles: (pmids: string[]) => Promise<void>;
  onMergeDuplicates: () => Promise<void>;
  addKnowledgeBaseEntries: (entries: KnowledgeBaseEntry[]) => Promise<void>;
  onPruneByRelevance: (score: number) => Promise<void>;
  addSingleArticleReport: (article: RankedArticle) => Promise<void>;
  isLoading: boolean;
}

/**
 * `Partial<KnowledgeBaseEntry>` only exposes fields common to every variant
 * of the ResearchEntry | AuthorProfileEntry | JournalEntry union. Entry
 * updates need to set variant-specific fields (report/profile/journalProfile)
 * depending on sourceType, so this widens the shape to allow them too.
 */
type KnowledgeBaseEntryChanges = Partial<KnowledgeBaseEntry> & {
  input?: ResearchInput | AuthorProfileInput;
  report?: ResearchReport;
  profile?: AuthorProfile;
  journalProfile?: JournalProfile;
};

const KnowledgeBaseContext = createContext<KnowledgeBaseContextType | undefined>(undefined);

export const KnowledgeBaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const { isLoading } = useAppSelector((state) => state.knowledgeBase);
  const knowledgeBase = useAppSelector(selectAllEntries);
  const uniqueArticles = useAppSelector(selectUniqueArticles);

  useEffect(() => {
    dispatch(fetchKnowledgeBase());
  }, [dispatch]);

  useDemoKnowledgeBaseSeed(dispatch, isLoading, knowledgeBase.length);

  const showNotification = useCallback(
    (message: string, type: 'success' | 'error' = 'success') => {
      dispatch(setNotification({ id: Date.now(), message, type }));
    },
    [dispatch],
  );

  const saveReport = useCallback(
    async (researchInput: ResearchInput, report: ResearchReport): Promise<void> => {
      const timestamp = Date.now();
      const newEntry: ResearchEntry = {
        id: `${timestamp}-${Math.random()}`,
        timestamp,
        sourceType: 'research',
        title: researchInput.researchTopic,
        articles: report.rankedArticles || [],
        input: researchInput,
        report,
      };
      await dispatch(addKbEntry(newEntry));
    },
    [dispatch],
  );

  const saveAuthorProfile = useCallback(
    async (input: AuthorProfileInput, profile: AuthorProfile): Promise<void> => {
      const timestamp = Date.now();
      const newEntry: AuthorProfileEntry = {
        id: `${timestamp}-${Math.random()}`,
        timestamp,
        sourceType: 'author',
        title: profile.name,
        articles: profile.publications || [],
        input,
        profile,
      };
      await dispatch(addKbEntry(newEntry));
    },
    [dispatch],
  );

  const saveJournalProfile = useCallback(
    async (profile: JournalProfile, articles: Article[]): Promise<void> => {
      const timestamp = Date.now();
      const newEntry: JournalEntry = {
        id: `${timestamp}-${Math.random()}`,
        timestamp,
        sourceType: 'journal',
        title: profile.name,
        articles: articles,
        journalProfile: profile,
      };
      await dispatch(addKbEntry(newEntry));
    },
    [dispatch],
  );

  const clearKnowledgeBase = useCallback(async () => {
    try {
      await dispatch(clearKb()).unwrap();
      markDemoSeedConsumed();
    } catch {
      showNotification('Failed to clear knowledge base.', 'error');
      throw new Error('Failed to clear knowledge base');
    }
  }, [dispatch, showNotification]);

  const clearDemoData = useCallback(async () => {
    const demoIds = knowledgeBase.filter((e) => isDemoEntryId(e.id)).map((e) => e.id);
    if (demoIds.length === 0) return;
    try {
      await deleteEntriesFromDb(demoIds);
      await dispatch(fetchKnowledgeBase()).unwrap();
      try {
        localStorage.setItem(DEMO_DISMISS_STORAGE_KEY, '1');
      } catch {
        /* ignore quota / private mode */
      }
    } catch {
      showNotification('Failed to remove demo data.', 'error');
      throw new Error('Failed to remove demo data');
    }
  }, [dispatch, knowledgeBase, showNotification]);

  const updateEntryTitle = useCallback(
    async (id: string, newTitle: string) => {
      const entryToUpdate = knowledgeBase.find((e) => e.id === id);
      if (!entryToUpdate) return;

      const changesForDb: KnowledgeBaseEntryChanges = { title: newTitle };
      if (entryToUpdate.sourceType === 'research')
        changesForDb.input = { ...entryToUpdate.input, researchTopic: newTitle };
      else if (entryToUpdate.sourceType === 'author')
        changesForDb.input = { ...entryToUpdate.input, authorName: newTitle };
      else if (entryToUpdate.sourceType === 'journal')
        changesForDb.journalProfile = { ...entryToUpdate.journalProfile, name: newTitle };

      await dispatch(updateKbEntry({ id, changes: changesForDb }));
      showNotification('Entry title updated successfully.');
    },
    [dispatch, knowledgeBase, showNotification],
  );

  const updateTags = useCallback(
    async (pmid: string, newTags: string[]) => {
      const updatedEntries: { id: string; changes: Partial<KnowledgeBaseEntry> }[] = [];

      knowledgeBase.forEach((entry) => {
        let hasChanged = false;
        const updateArticle = (article: RankedArticle): RankedArticle => {
          if (article.pmid === pmid) {
            hasChanged = true;
            return { ...article, customTags: newTags };
          }
          return article;
        };

        const newArticles = (entry.articles || []).map(updateArticle);
        if (!hasChanged) return;

        const changes: KnowledgeBaseEntryChanges = { articles: newArticles };
        if (entry.sourceType === 'research')
          changes.report = { ...entry.report, rankedArticles: newArticles };
        else if (entry.sourceType === 'author')
          changes.profile = { ...entry.profile, publications: newArticles };

        updatedEntries.push({ id: entry.id, changes });
      });

      if (updatedEntries.length > 0) {
        await Promise.all(updatedEntries.map((e) => dispatch(updateKbEntry(e))));
        // Redux state will update via fetchKnowledgeBase re-fetch or simpler optimistic update (here simplified)
        dispatch(fetchKnowledgeBase());
      }
    },
    [dispatch, knowledgeBase],
  );

  const deleteArticles = useCallback(
    async (pmids: string[]) => {
      const pmidSet = new Set(pmids);
      const updates: { id: string; changes: Partial<KnowledgeBaseEntry> }[] = [];
      const toDeleteIds: string[] = [];

      knowledgeBase.forEach((entry) => {
        const keptArticles = (entry.articles || []).filter((a) => !pmidSet.has(a.pmid));
        if (keptArticles.length < entry.articles.length) {
          if (keptArticles.length === 0) {
            toDeleteIds.push(entry.id);
          } else {
            const changes: KnowledgeBaseEntryChanges = { articles: keptArticles };
            if (entry.sourceType === 'research')
              changes.report = { ...entry.report, rankedArticles: keptArticles };
            else if (entry.sourceType === 'author')
              changes.profile = { ...entry.profile, publications: keptArticles };
            updates.push({ id: entry.id, changes });
          }
        }
      });

      if (updates.length > 0) await Promise.all(updates.map((u) => dispatch(updateKbEntry(u))));
      if (toDeleteIds.length > 0) await deleteEntriesFromDb(toDeleteIds);

      dispatch(fetchKnowledgeBase());
    },
    [dispatch, knowledgeBase],
  );

  const getArticles = useCallback(
    (filterType: 'all' | 'research' | 'author' | 'journal' = 'all'): AggregatedArticle[] => {
      const articleMap = new Map<string, AggregatedArticle>();
      knowledgeBase.forEach((entry) => {
        if (filterType !== 'all' && entry.sourceType !== filterType) return;
        entry.articles.forEach((article) => {
          const existing = articleMap.get(article.pmid);
          if (!existing || article.relevanceScore > existing.relevanceScore) {
            articleMap.set(article.pmid, {
              ...article,
              sourceId: entry.id,
              sourceTitle: entry.title,
            });
          }
        });
      });
      return Array.from(articleMap.values());
    },
    [knowledgeBase],
  );

  const onMergeDuplicates = useCallback(async () => {
    try {
      const duplicateGroups = countDuplicateArticleGroups(knowledgeBase);
      if (duplicateGroups === 0) {
        showNotification(t('settings.kb.notification.no_duplicates'));
        return;
      }

      const { updates, harmonizedCopies } = buildHarmonizeDuplicateUpdates(knowledgeBase);
      if (updates.length === 0) {
        showNotification(t('settings.kb.notification.already_canonical'));
        return;
      }

      await dispatch(bulkUpdateKbEntries(updates)).unwrap();
      dispatch(fetchKnowledgeBase());
      showNotification(t('settings.kb.notification.harmonized', { count: harmonizedCopies }));
    } catch {
      showNotification(t('settings.kb.notification.merge_failed'), 'error');
    }
  }, [knowledgeBase, dispatch, showNotification, t]);

  const addKnowledgeBaseEntries = useCallback(
    async (entries: KnowledgeBaseEntry[]) => {
      await dispatch(importKbEntries(entries));
    },
    [dispatch],
  );

  const addSingleArticleReport = useCallback(
    async (article: RankedArticle) => {
      const report: ResearchReport = {
        generatedQueries: [],
        rankedArticles: [article],
        synthesis: `This is a single-article report for "${article.title}".`,
        aiGeneratedInsights: [],
        overallKeywords: article.keywords.map((kw) => ({ keyword: kw, frequency: 1 })),
      };
      const input: ResearchInput = {
        researchTopic: `Single Article: ${article.title}`,
        dateRange: 'any',
        articleTypes: [],
        synthesisFocus: 'overview',
        maxArticlesToScan: 1,
        topNToSynthesize: 1,
      };
      await saveReport(input, report);
    },
    [saveReport],
  );

  const onPruneByRelevance = useCallback(
    async (pruneScore: number) => {
      try {
        const { updates, deleteEntryIds, pruneCount } = buildResearchPrunePlan(
          knowledgeBase,
          pruneScore,
        );
        if (pruneCount > 0) {
          if (updates.length > 0) {
            await dispatch(bulkUpdateKbEntries(updates)).unwrap();
          }
          if (deleteEntryIds.length > 0) {
            await deleteEntriesFromDb(deleteEntryIds);
          }
          dispatch(fetchKnowledgeBase());
          showNotification(t('settings.kb.notification.pruned', { count: pruneCount }));
        } else {
          showNotification(
            t('settings.kb.notification.no_prune_candidates', { score: pruneScore }),
            'error',
          );
        }
      } catch {
        showNotification(t('settings.kb.notification.prune_failed'), 'error');
      }
    },
    [knowledgeBase, dispatch, showNotification, t],
  );

  const getRecentResearchEntries = useCallback(
    (count: number): ResearchEntry[] => {
      return knowledgeBase
        .filter((e): e is ResearchEntry => e.sourceType === 'research')
        .slice(0, count); // Adapter sorts by default
    },
    [knowledgeBase],
  );

  const providerValue = useMemo(
    () => ({
      knowledgeBase,
      uniqueArticles,
      getArticles,
      getRecentResearchEntries,
      saveReport,
      saveAuthorProfile,
      saveJournalProfile,
      clearKnowledgeBase,
      clearDemoData,
      updateEntryTitle,
      updateTags,
      deleteArticles,
      onMergeDuplicates,
      addKnowledgeBaseEntries,
      onPruneByRelevance,
      addSingleArticleReport,
      isLoading,
    }),
    [
      knowledgeBase,
      uniqueArticles,
      getArticles,
      getRecentResearchEntries,
      saveReport,
      saveAuthorProfile,
      saveJournalProfile,
      clearKnowledgeBase,
      clearDemoData,
      updateEntryTitle,
      updateTags,
      deleteArticles,
      onMergeDuplicates,
      addKnowledgeBaseEntries,
      onPruneByRelevance,
      addSingleArticleReport,
      isLoading,
    ],
  );

  return (
    <KnowledgeBaseContext.Provider value={providerValue}>{children}</KnowledgeBaseContext.Provider>
  );
};

export const useKnowledgeBase = (): KnowledgeBaseContextType => {
  const context = useContext(KnowledgeBaseContext);
  if (context === undefined) {
    throw new Error('useKnowledgeBase must be used within a KnowledgeBaseProvider');
  }
  return context;
};
