import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { KnowledgeBaseEntry, ResearchInput, ResearchReport, RankedArticle, AggregatedArticle, AuthorProfile, AuthorProfileInput, ResearchEntry, AuthorProfileEntry, JournalProfile, JournalEntry, Article } from '../types';
import { useUI } from './UIContext';
import { getAllEntries, addEntry, deleteEntries as deleteEntriesFromDb, clearAllEntries as clearAllEntriesFromDb, updateEntry, bulkAddEntries } from '../services/databaseService';

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
    const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBaseEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { setNotification } = useUI();

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const entries = await getAllEntries();
                setKnowledgeBase(entries);
            } catch (error) {
                console.error("Failed to load data from IndexedDB:", error);
                setNotification({ message: "Error loading knowledge base.", type: 'error', id: Date.now() });
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [setNotification]);


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
        await addEntry(newEntry);
        setKnowledgeBase(prevKB => [...prevKB, newEntry]);
        showNotification("Report saved to Knowledge Base.");
    }, [showNotification]);
    
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
        await addEntry(newEntry);
        setKnowledgeBase(prev => [...prev, newEntry]);
        showNotification(`Profile for ${profile.name} saved to Knowledge Base.`);
    }, [showNotification]);

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
        await addEntry(newEntry);
        setKnowledgeBase(prev => [...prev, newEntry]);
        showNotification(`Profile for ${profile.name} saved to Knowledge Base.`);
    }, [showNotification]);


    const clearKnowledgeBase = useCallback(async () => {
        await clearAllEntriesFromDb();
        setKnowledgeBase([]);
        showNotification("Knowledge Base cleared.");
    }, [showNotification]);

    const updateEntryTitle = useCallback(async (id: string, newTitle: string) => {
        const entryToUpdate = knowledgeBase.find(e => e.id === id);
        if (!entryToUpdate) return;

        let updatedEntry: KnowledgeBaseEntry;
        let changesForDb: Partial<KnowledgeBaseEntry>;

        if (entryToUpdate.sourceType === 'research') {
            const researchEntry = entryToUpdate as ResearchEntry;
            const newInput = { ...researchEntry.input, researchTopic: newTitle };
            updatedEntry = { ...researchEntry, title: newTitle, input: newInput };
            changesForDb = { title: newTitle, input: newInput };
        } else if (entryToUpdate.sourceType === 'author') {
            const authorEntry = entryToUpdate as AuthorProfileEntry;
            const newInput = { ...authorEntry.input, authorName: newTitle };
            updatedEntry = { ...authorEntry, title: newTitle, input: newInput };
            changesForDb = { title: newTitle, input: newInput };
        } else { // journal
            const journalEntry = entryToUpdate as JournalEntry;
            const newJournalProfile = { ...journalEntry.journalProfile, name: newTitle };
            updatedEntry = { ...journalEntry, title: newTitle, journalProfile: newJournalProfile };
            changesForDb = { title: newTitle, journalProfile: newJournalProfile };
        }

        await updateEntry(id, changesForDb);
        setKnowledgeBase(prevKB => prevKB.map(entry => (entry.id === id ? updatedEntry : entry)));
        showNotification("Entry title updated successfully.");

    }, [knowledgeBase, showNotification]);

    const updateTags = useCallback(async (pmid: string, newTags: string[]) => {
        const updatedEntries: { id: string, changes: Partial<KnowledgeBaseEntry> }[] = [];
        const newKnowledgeBase = knowledgeBase.map(entry => {
            let hasChanged = false;
            const updateArticle = (article: RankedArticle): RankedArticle => {
                if (article.pmid === pmid) {
                    hasChanged = true;
                    return { ...article, customTags: newTags };
                }
                return article;
            };

            const newArticles = (entry.articles || []).map(updateArticle);
            if (!hasChanged) return entry;
            
            if (entry.sourceType === 'research') {
                const updatedEntry: ResearchEntry = {
                    ...entry,
                    articles: newArticles,
                    report: { ...entry.report, rankedArticles: newArticles }
                };
                updatedEntries.push({ id: entry.id, changes: { articles: updatedEntry.articles, report: updatedEntry.report }});
                return updatedEntry;
            } else if (entry.sourceType === 'author') {
                const updatedEntry: AuthorProfileEntry = {
                    ...entry,
                    articles: newArticles,
                    profile: { ...entry.profile, publications: newArticles }
                };
                updatedEntries.push({ id: entry.id, changes: { articles: updatedEntry.articles, profile: updatedEntry.profile }});
                return updatedEntry;
            } else if (entry.sourceType === 'journal') {
                 const updatedEntry: JournalEntry = { ...entry, articles: newArticles };
                 updatedEntries.push({ id: entry.id, changes: { articles: updatedEntry.articles }});
                 return updatedEntry;
            }
            return entry;
        });

        if (updatedEntries.length > 0) {
            await Promise.all(updatedEntries.map(e => updateEntry(e.id, e.changes)));
            setKnowledgeBase(newKnowledgeBase);
        }

    }, [knowledgeBase]);

    const deleteArticles = useCallback(async (pmids: string[]) => {
        const pmidSet = new Set(pmids);
        const updates: { id: string, changes: Partial<KnowledgeBaseEntry> }[] = [];
        const toDelete: string[] = [];

        knowledgeBase.forEach(entry => {
            const initialArticleCount = entry.articles.length;
            const keptArticles = (entry.articles || []).filter(a => !pmidSet.has(a.pmid));
            if (keptArticles.length < initialArticleCount) {
                if (keptArticles.length === 0) {
                    toDelete.push(entry.id);
                } else {
                    const changes: Partial<KnowledgeBaseEntry> = { articles: keptArticles };
                    if (entry.sourceType === 'research') (changes as Partial<ResearchEntry>).report = { ...entry.report, rankedArticles: keptArticles };
                    else if (entry.sourceType === 'author') (changes as Partial<AuthorProfileEntry>).profile = { ...entry.profile, publications: keptArticles };
                    // No extra changes needed for 'journal' as 'articles' is top-level
                    updates.push({ id: entry.id, changes });
                }
            }
        });

        if (updates.length > 0) await Promise.all(updates.map(u => updateEntry(u.id, u.changes)));
        if (toDelete.length > 0) await deleteEntriesFromDb(toDelete);
        
        setKnowledgeBase(prev => prev.map(entry => {
            const update = updates.find(u => u.id === entry.id);
            if (update) return { ...entry, ...update.changes } as KnowledgeBaseEntry;
            return entry;
        }).filter(entry => !toDelete.includes(entry.id)));
        
        showNotification(`${pmids.length} article(s) deleted from Knowledge Base.`);

    }, [knowledgeBase, showNotification]);
    
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

    const uniqueArticles = useMemo(() => getArticles('all'), [getArticles]);

    const onMergeDuplicates = useCallback(async () => {
        const articleMap = new Map<string, { article: RankedArticle, entryId: string }>();
        let duplicatesFound = 0;
        let pmidsToDelete: { entryId: string, pmid: string }[] = [];

        knowledgeBase.forEach(entry => {
            entry.articles.forEach(article => {
                const existing = articleMap.get(article.pmid);
                if (existing) {
                    duplicatesFound++;
                    // Decide which one to keep
                    if (article.relevanceScore > existing.article.relevanceScore) {
                        // Mark old one for deletion
                        pmidsToDelete.push({ entryId: existing.entryId, pmid: article.pmid });
                        // Set new one
                        articleMap.set(article.pmid, { article, entryId: entry.id });
                    } else {
                        // Mark current one for deletion
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
                     if (entry.sourceType === 'research') (changes as Partial<ResearchEntry>).report = { ...entry.report, rankedArticles: keptArticles };
                     else if (entry.sourceType === 'author') (changes as Partial<AuthorProfileEntry>).profile = { ...entry.profile, publications: keptArticles };
                     updates.push({ id: entry.id, changes });
                 }
            }
        });
        
        if (updates.length > 0) await Promise.all(updates.map(u => updateEntry(u.id, u.changes)));
        if (entriesToDelete.size > 0) await deleteEntriesFromDb(Array.from(entriesToDelete));

        setKnowledgeBase(prev => prev
            .map(entry => {
                const update = updates.find(u => u.id === entry.id);
                return update ? { ...entry, ...update.changes } as KnowledgeBaseEntry : entry;
            })
            .filter(entry => !entriesToDelete.has(entry.id))
        );
        showNotification(`Merged ${duplicatesFound} duplicate article entries.`);

    }, [knowledgeBase, showNotification]);


    const addKnowledgeBaseEntries = useCallback(async (entries: KnowledgeBaseEntry[]) => {
        const validEntries = entries.filter(entry => ('sourceType' in entry) && ['research', 'author', 'journal'].includes(entry.sourceType));
        if (validEntries.length > 0) {
            await bulkAddEntries(validEntries);
            setKnowledgeBase(kb => [...kb, ...validEntries]);
            showNotification("Knowledge base imported successfully.");
        } else {
            showNotification("Import file did not contain valid entries.", "error");
        }
    }, [showNotification]);

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
        const toPrunePmids = new Set(uniqueArticles.filter(a => a.relevanceScore < pruneScore).map(a => a.pmid));
        if (toPrunePmids.size > 0) {
            await deleteArticles(Array.from(toPrunePmids));
            showNotification(`${toPrunePmids.size} article(s) pruned.`);
        } else {
            showNotification(`No articles found with a score below ${pruneScore}.`, "error");
        }
    }, [uniqueArticles, deleteArticles, showNotification]);

    const getRecentResearchEntries = useCallback((count: number): ResearchEntry[] => {
        return knowledgeBase
            .filter((e): e is ResearchEntry => e.sourceType === 'research')
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, count);
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