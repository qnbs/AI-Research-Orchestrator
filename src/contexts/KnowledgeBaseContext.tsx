
import React, { createContext, useContext, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { KnowledgeBaseEntry, ResearchInput, ResearchReport, RankedArticle, AggregatedArticle, AuthorProfile, AuthorProfileInput, ResearchEntry, AuthorProfileEntry, JournalProfile, JournalEntry, Article } from '../types';
import { useUI } from './UIContext';
import { updateEntry, deleteEntries as deleteEntriesFromDb, bulkAddEntries } from '../services/databaseService';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { 
    fetchKnowledgeBase, 
    addKbEntry, 
    importKbEntries, 
    clearKb, 
    selectUniqueArticles, 
    selectAllEntries,
    selectRecentResearchEntries,
    updateKbEntry
} from '../store/slices/knowledgeBaseSlice';

interface KnowledgeBaseContextType {
    knowledgeBase: KnowledgeBaseEntry[];
    uniqueArticles: AggregatedArticle[];
    getArticles: (sourceType?: 'all' | 'research' | 'author' | 'journal') => AggregatedArticle[];
    getRecentResearchEntries: (count: number) => ResearchEntry[];
    saveReport: (researchInput: ResearchInput, report: ResearchReport) => Promise<void>;
    saveAuthorProfile: (input: AuthorProfileInput, profile: AuthorProfile) => Promise<void>;
    saveJournalProfile: (profile: JournalProfile, articles: Article[]) => Promise<void>;
    clearKnowledgeBase: () => Promise<void>;
    updateEntryTitle: (id: string, newTitle: string) => Promise<void>;
    updateTags: (pmid: string, newTags: string[]) => Promise<void>;
    deleteArticles: (pmids: string[]) => Promise<void>;
    onMergeDuplicates: () => Promise<void>;
    addKnowledgeBaseEntries: (entries: KnowledgeBaseEntry[]) => Promise<void>;
    onPruneByRelevance: (score: number) => Promise<void>;
    addSingleArticleReport: (article: RankedArticle) => Promise<void>;
    isLoading: boolean;
}

const KnowledgeBaseContext = createContext<KnowledgeBaseContextType | undefined>(undefined);

export const KnowledgeBaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const dispatch = useAppDispatch();
    const { isLoading } = useAppSelector(state => state.knowledgeBase);
    const knowledgeBase = useAppSelector(selectAllEntries);
    const uniqueArticles = useAppSelector(selectUniqueArticles);
    
    const { setNotification } = useUI();

    useEffect(() => {
        dispatch(fetchKnowledgeBase());
    }, [dispatch]);

    const showNotification = useCallback((message: string, type: 'success' | 'error' = 'success') => {
        setNotification({ id: Date.now(), message, type });
    }, [setNotification]);

    const saveReport = useCallback(async (researchInput: ResearchInput, report: ResearchReport): Promise<void> => {
        const timestamp = Date.now();
        const newEntry: ResearchEntry = { 
            id: `${timestamp}-${Math.random()}`,
            timestamp,
            sourceType: 'research',
            title: researchInput.researchTopic,
            articles: report.rankedArticles || [],
            input: researchInput, 
            report 
        };
        await dispatch(addKbEntry(newEntry));
    }, [dispatch]);
    
    const saveAuthorProfile = useCallback(async (input: AuthorProfileInput, profile: AuthorProfile): Promise<void> => {
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
    }, [dispatch]);

    const saveJournalProfile = useCallback(async (profile: JournalProfile, articles: Article[]): Promise<void> => {
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
    }, [dispatch]);

    const clearKnowledgeBase = useCallback(async () => {
        await dispatch(clearKb());
    }, [dispatch]);

    const updateEntryTitle = useCallback(async (id: string, newTitle: string) => {
        const entryToUpdate = knowledgeBase.find(e => e.id === id);
        if (!entryToUpdate) return;

        let changesForDb: any = { title: newTitle };
        if (entryToUpdate.sourceType === 'research') changesForDb.input = { ...entryToUpdate.input, researchTopic: newTitle };
        else if (entryToUpdate.sourceType === 'author') changesForDb.input = { ...entryToUpdate.input, authorName: newTitle };
        else if (entryToUpdate.sourceType === 'journal') changesForDb.journalProfile = { ...entryToUpdate.journalProfile, name: newTitle };

        await dispatch(updateKbEntry({ id, changes: changesForDb }));
        showNotification("Entry title updated successfully.");
    }, [dispatch, knowledgeBase, showNotification]);

    const updateTags = useCallback(async (pmid: string, newTags: string[]) => {
        const updatedEntries: { id: string, changes: Partial<KnowledgeBaseEntry> }[] = [];
        
        knowledgeBase.forEach(entry => {
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
            
            const changes: Partial<KnowledgeBaseEntry> = { articles: newArticles };
            if (entry.sourceType === 'research') (changes as any).report = { ...entry.report, rankedArticles: newArticles };
            else if (entry.sourceType === 'author') (changes as any).profile = { ...entry.profile, publications: newArticles };
            
            updatedEntries.push({ id: entry.id, changes });
        });

        if (updatedEntries.length > 0) {
            await Promise.all(updatedEntries.map(e => dispatch(updateKbEntry(e))));
            // Redux state will update via fetchKnowledgeBase re-fetch or simpler optimistic update (here simplified)
            dispatch(fetchKnowledgeBase()); 
        }
    }, [dispatch, knowledgeBase]);

    const deleteArticles = useCallback(async (pmids: string[]) => {
        const pmidSet = new Set(pmids);
        const updates: { id: string, changes: Partial<KnowledgeBaseEntry> }[] = [];
        const toDeleteIds: string[] = [];

        knowledgeBase.forEach(entry => {
            const keptArticles = (entry.articles || []).filter(a => !pmidSet.has(a.pmid));
            if (keptArticles.length < entry.articles.length) {
                if (keptArticles.length === 0) {
                    toDeleteIds.push(entry.id);
                } else {
                    const changes: Partial<KnowledgeBaseEntry> = { articles: keptArticles };
                    if (entry.sourceType === 'research') (changes as any).report = { ...entry.report, rankedArticles: keptArticles };
                    else if (entry.sourceType === 'author') (changes as any).profile = { ...entry.profile, publications: keptArticles };
                    updates.push({ id: entry.id, changes });
                }
            }
        });

        if (updates.length > 0) await Promise.all(updates.map(u => dispatch(updateKbEntry(u))));
        if (toDeleteIds.length > 0) await dispatch(deleteEntriesFromDb(toDeleteIds)); // Direct DB call then refresh
        
        dispatch(fetchKnowledgeBase());
    }, [dispatch, knowledgeBase]);
    
    const getArticles = useCallback((filterType: 'all' | 'research' | 'author' | 'journal' = 'all'): AggregatedArticle[] => {
        const articleMap = new Map<string, AggregatedArticle>();
        knowledgeBase.forEach(entry => {
            if (filterType !== 'all' && entry.sourceType !== filterType) return;
            entry.articles.forEach(article => {
                const existing = articleMap.get(article.pmid);
                if (!existing || article.relevanceScore > existing.relevanceScore) {
                    articleMap.set(article.pmid, { ...article, sourceId: entry.id, sourceTitle: entry.title });
                }
            });
        });
        return Array.from(articleMap.values());
    }, [knowledgeBase]);

    const onMergeDuplicates = useCallback(async () => {
        // This logic is heavy and should probably be in a Thunk or Worker, 
        // keeping in Context for compatibility but invoking refreshes via Redux
        try {
            const articleMap = new Map<string, { article: RankedArticle, entryId: string }>();
            let duplicatesFound = 0;
            let pmidsToDelete: { entryId: string, pmid: string }[] = [];

            knowledgeBase.forEach(entry => {
                entry.articles.forEach(article => {
                    const existing = articleMap.get(article.pmid);
                    if (existing) {
                        duplicatesFound++;
                        if (article.relevanceScore > existing.article.relevanceScore) {
                            pmidsToDelete.push({ entryId: existing.entryId, pmid: article.pmid });
                            articleMap.set(article.pmid, { article, entryId: entry.id });
                        } else {
                            pmidsToDelete.push({ entryId: entry.id, pmid: article.pmid });
                        }
                    } else {
                        articleMap.set(article.pmid, { article, entryId: entry.id });
                    }
                });
            });
            
            if (duplicatesFound === 0) {
                showNotification("No duplicate articles found to merge.");
                return;
            }

            const updates: { id: string, changes: Partial<KnowledgeBaseEntry> }[] = [];
            const entriesToDelete = new Set<string>();

            knowledgeBase.forEach(entry => {
                const pmidsInThisEntryToDelete = pmidsToDelete.filter(d => d.entryId === entry.id).map(d => d.pmid);
                if (pmidsInThisEntryToDelete.length > 0) {
                     const keptArticles = entry.articles.filter(a => !pmidsInThisEntryToDelete.includes(a.pmid));
                     if(keptArticles.length === 0) {
                         entriesToDelete.add(entry.id);
                     } else {
                         const changes: Partial<KnowledgeBaseEntry> = { articles: keptArticles };
                         if (entry.sourceType === 'research') (changes as any).report = { ...entry.report, rankedArticles: keptArticles };
                         else if (entry.sourceType === 'author') (changes as any).profile = { ...entry.profile, publications: keptArticles };
                         updates.push({ id: entry.id, changes });
                     }
                }
            });
            
            if (updates.length > 0) await Promise.all(updates.map(u => dispatch(updateKbEntry(u))));
            if (entriesToDelete.size > 0) await deleteEntriesFromDb(Array.from(entriesToDelete));

            dispatch(fetchKnowledgeBase());
            showNotification(`Merged ${duplicatesFound} duplicate article entries.`);
        } catch (error) {
            showNotification("Failed to merge duplicates.", "error");
        }
    }, [knowledgeBase, dispatch, showNotification]);

    const addKnowledgeBaseEntries = useCallback(async (entries: KnowledgeBaseEntry[]) => {
        await dispatch(importKbEntries(entries));
    }, [dispatch]);

    const addSingleArticleReport = useCallback(async (article: RankedArticle) => {
        const report: ResearchReport = {
            generatedQueries: [], rankedArticles: [article],
            synthesis: `This is a single-article report for "${article.title}".`,
            aiGeneratedInsights: [],
            overallKeywords: article.keywords.map(kw => ({ keyword: kw, frequency: 1 })),
        };
        const input: ResearchInput = {
            researchTopic: `Single Article: ${article.title}`, dateRange: 'any',
            articleTypes: [], synthesisFocus: 'overview', maxArticlesToScan: 1, topNToSynthesize: 1,
        };
        await saveReport(input, report);
    }, [saveReport]);

    const onPruneByRelevance = useCallback(async (pruneScore: number) => {
        try {
            const toPrunePmids = new Set<string>(uniqueArticles.filter(a => a.relevanceScore < pruneScore).map(a => a.pmid));
            if (toPrunePmids.size > 0) {
                await deleteArticles(Array.from(toPrunePmids));
                showNotification(`${toPrunePmids.size} article(s) pruned.`);
            } else {
                showNotification(`No articles found with a score below ${pruneScore}.`, "error");
            }
        } catch (error) {
            showNotification("Failed to prune articles.", "error");
        }
    }, [uniqueArticles, deleteArticles, showNotification]);

    const getRecentResearchEntries = useCallback((count: number): ResearchEntry[] => {
        return knowledgeBase
            .filter((e): e is ResearchEntry => e.sourceType === 'research')
            .slice(0, count); // Adapter sorts by default
    }, [knowledgeBase]);

    const providerValue = useMemo(() => ({
        knowledgeBase, uniqueArticles, getArticles, getRecentResearchEntries, saveReport, saveAuthorProfile, saveJournalProfile, clearKnowledgeBase, updateEntryTitle,
        updateTags, deleteArticles, onMergeDuplicates, addKnowledgeBaseEntries, onPruneByRelevance, addSingleArticleReport,
        isLoading
    }), [
        knowledgeBase, uniqueArticles, getArticles, getRecentResearchEntries, saveReport, saveAuthorProfile, saveJournalProfile, clearKnowledgeBase, updateEntryTitle,
        updateTags, deleteArticles, onMergeDuplicates, addKnowledgeBaseEntries, onPruneByRelevance, addSingleArticleReport, isLoading
    ]);

    return (
        <KnowledgeBaseContext.Provider value={providerValue}>
            {children}
        </KnowledgeBaseContext.Provider>
    );
};

export const useKnowledgeBase = (): KnowledgeBaseContextType => {
    const context = useContext(KnowledgeBaseContext);
    if (context === undefined) {
        throw new Error('useKnowledgeBase must be used within a KnowledgeBaseProvider');
    }
    return context;
};
