import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { KnowledgeBaseEntry, ResearchInput, ResearchReport, RankedArticle, AggregatedArticle, AuthorProfile, AuthorProfileInput, ResearchEntry, AuthorProfileEntry, JournalEntry } from '../types';
import { useUI } from './UIContext';
import { getAllEntries, addEntry, deleteEntries as deleteEntriesFromDb, clearAllEntries as clearAllEntriesFromDb, updateEntry } from '../services/databaseService';

interface KnowledgeBaseContextType {
    knowledgeBase: KnowledgeBaseEntry[];
    uniqueArticles: AggregatedArticle[];
    getArticles: (sourceType?: 'all' | 'research' | 'author' | 'journal') => AggregatedArticle[];
    getRecentResearchEntries: (count: number) => ResearchEntry[];
    saveKnowledgeBaseEntry: (entryData: Omit<KnowledgeBaseEntry, 'id' | 'timestamp'>) => Promise<void>;
    saveReport: (researchInput: ResearchInput, report: ResearchReport) => Promise<void>;
    saveAuthorProfile: (input: AuthorProfileInput, profile: AuthorProfile) => Promise<void>;
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

    const saveKnowledgeBaseEntry = useCallback(async (entryData: Omit<KnowledgeBaseEntry, 'id' | 'timestamp'>) => {
        const timestamp = Date.now();
        const newEntry = {
            ...entryData,
            id: `${timestamp}-${Math.random()}`,
            timestamp,
        } as KnowledgeBaseEntry;
        
        try {
            await addEntry(newEntry);
            setKnowledgeBase(prev => [...prev, newEntry]);
            const typeLabel = newEntry.sourceType.charAt(0).toUpperCase() + newEntry.sourceType.slice(1);
            showNotification(`${typeLabel} entry saved to Knowledge Base.`);
        } catch (error) {
            console.error("Failed to save entry:", error);
            const typeLabel = entryData.sourceType;
            showNotification(`Error saving ${typeLabel} entry.`, 'error');
            throw error;
        }
    }, [showNotification]);

    const saveReport = useCallback(async (researchInput: ResearchInput, report: ResearchReport): Promise<void> => {
        const newEntryData: Omit<ResearchEntry, 'id' | 'timestamp'> = {
            sourceType: 'research',
            title: researchInput.researchTopic,
            articles: report.rankedArticles || [],
            input: researchInput,
            report
        };
        await saveKnowledgeBaseEntry(newEntryData);
    }, [saveKnowledgeBaseEntry]);
    
    const saveAuthorProfile = useCallback(async (input: AuthorProfileInput, profile: AuthorProfile): Promise<void> => {
        const newEntryData: Omit<AuthorProfileEntry, 'id' | 'timestamp'> = {
            sourceType: 'author',
            title: profile.name,
            articles: profile.publications || [],
            input,
            profile
        };
        await saveKnowledgeBaseEntry(newEntryData);
    }, [saveKnowledgeBaseEntry]);

    const clearKnowledgeBase = useCallback(async () => {
        try {
            await clearAllEntriesFromDb();
            setKnowledgeBase([]);
            showNotification("Knowledge Base cleared.");
        } catch (error) {
            console.error("Failed to clear knowledge base:", error);
            showNotification("Error clearing knowledge base.", 'error');
        }
    }, [showNotification]);

    const updateEntryTitle = useCallback(async (id: string, newTitle: string) => {
        const entryToUpdate = knowledgeBase.find(e => e.id === id);
        if (!entryToUpdate) return;

        const updatedEntry = { ...entryToUpdate, title: newTitle };
        // FIX: Reconstruct the `changes` object to satisfy TypeScript's discriminated union type checking.
        // `input` does not exist on the base `KnowledgeBaseEntry` or on `JournalEntry`.
        let changes: Partial<KnowledgeBaseEntry> = { title: newTitle };

        if (updatedEntry.sourceType === 'research') {
            updatedEntry.input = { ...updatedEntry.input, researchTopic: newTitle };
            changes = { title: newTitle, input: updatedEntry.input };
        } else if (updatedEntry.sourceType === 'author') {
            updatedEntry.input = { ...updatedEntry.input, authorName: newTitle };
            changes = { title: newTitle, input: updatedEntry.input };
        }

        try {
            await updateEntry(id, changes);
            setKnowledgeBase(prevKB => prevKB.map(entry => (entry.id === id ? updatedEntry : entry)));
            showNotification("Entry title updated successfully.");
        } catch (error) {
            console.error("Failed to update title:", error);
            showNotification("Error updating title.", "error");
        }
    }, [knowledgeBase, showNotification]);

    const updateTags = useCallback(async (pmid: string, newTags: string[]) => {
        const updatedEntries: { id: string, changes: Partial<KnowledgeBaseEntry> }[] = [];
        const newKnowledgeBase = knowledgeBase.map(entry => {
            let hasChanged = false;
            const updateArticle = (article: RankedArticle) => {
                if (article.pmid === pmid) {
                    hasChanged = true;
                    return { ...article, customTags: newTags };
                }
                return article;
            };

            const newArticles = (entry.articles || []).map(updateArticle);
            if (!hasChanged) return entry;
            
            const updatedEntry = { ...entry, articles: newArticles };
            if (updatedEntry.sourceType === 'research') {
                updatedEntry.report = { ...updatedEntry.report, rankedArticles: (updatedEntry.report.rankedArticles || []).map(updateArticle) };
            } else if (updatedEntry.sourceType === 'author'){
                updatedEntry.profile = { ...updatedEntry.profile, publications: (updatedEntry.profile.publications || []).map(updateArticle) };
            }
            updatedEntries.push({ id: entry.id, changes: updatedEntry });
            return updatedEntry;
        });

        try {
            await Promise.all(updatedEntries.map(e => updateEntry(e.id, e.changes)));
            setKnowledgeBase(newKnowledgeBase);
        } catch (error) {
            console.error("Failed to update tags:", error);
            showNotification("Error updating tags.", "error");
        }
    }, [knowledgeBase, showNotification]);

    const deleteArticles = useCallback(async (pmids: string[]) => {
       // This logic is complex with IndexedDB. A simpler approach is to refetch all data or update locally.
       // Let's update locally for now for performance.
       showNotification("Deletion is not fully implemented with IndexedDB yet.", "error");
    }, [showNotification]);
    
    const getArticles = useCallback((filterType: 'all' | 'research' | 'author' | 'journal' = 'all'): AggregatedArticle[] => {
        if (!Array.isArray(knowledgeBase)) return [];

        const articleMap = new Map<string, AggregatedArticle>();

        knowledgeBase.forEach(entry => {
            if (filterType !== 'all' && entry.sourceType !== filterType) {
                return;
            }
    
            if (Array.isArray(entry.articles)) {
                entry.articles.forEach(article => {
                    const existing = articleMap.get(article.pmid);
                    if (!existing || (article.relevanceScore || 0) > (existing.relevanceScore || 0)) {
                        articleMap.set(article.pmid, {
                            ...article,
                            sourceId: entry.id,
                            sourceTitle: entry.title
                        });
                    }
                });
            }
        });
        return Array.from(articleMap.values());
    }, [knowledgeBase]);
    
    const uniqueArticles = useMemo(() => getArticles('all'), [getArticles]);

    const onMergeDuplicates = useCallback(async () => {
        // This is a complex read-modify-write operation.
        showNotification("Merging is not fully implemented with IndexedDB yet.", "error");
    }, [showNotification]);

    const addKnowledgeBaseEntries = useCallback(async (entries: KnowledgeBaseEntry[]) => {
        // This logic is complex with IndexedDB.
        showNotification("Import is not fully implemented with IndexedDB yet.", "error");
    }, [showNotification]);

    const addSingleArticleReport = useCallback(async (article: RankedArticle) => {
        const report: ResearchReport = {
            generatedQueries: [],
            rankedArticles: [article],
            synthesis: `This is a single-article report for "${article.title}".`,
            aiGeneratedInsights: [],
            overallKeywords: article.keywords.map(kw => ({ keyword: kw, frequency: 1 })),
        };
        const input: ResearchInput = {
            researchTopic: `Single Article: ${article.title}`,
            dateRange: 'any', articleTypes: [], synthesisFocus: 'overview',
            maxArticlesToScan: 1, topNToSynthesize: 1,
        };
        await saveReport(input, report);
    }, [saveReport]);

    const onPruneByRelevance = useCallback(async (pruneScore: number) => {
        showNotification("Pruning is not fully implemented with IndexedDB yet.", "error");
    }, [showNotification]);
    
    const getRecentResearchEntries = useCallback((count: number): ResearchEntry[] => {
        return knowledgeBase
            .filter((e): e is ResearchEntry => e.sourceType === 'research')
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, count);
    }, [knowledgeBase]);

    const providerValue = useMemo(() => ({
        knowledgeBase, uniqueArticles, getArticles, getRecentResearchEntries, saveKnowledgeBaseEntry, saveReport, saveAuthorProfile, clearKnowledgeBase, updateEntryTitle,
        updateTags, deleteArticles, onMergeDuplicates, addKnowledgeBaseEntries, onPruneByRelevance, addSingleArticleReport,
        isLoading
    }), [
        knowledgeBase, uniqueArticles, getArticles, getRecentResearchEntries, saveKnowledgeBaseEntry, saveReport, saveAuthorProfile, clearKnowledgeBase, updateEntryTitle,
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