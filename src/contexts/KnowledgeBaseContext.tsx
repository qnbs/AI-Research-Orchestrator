import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
// Fix: Import new types and remove old ones which are now locally defined for migration.
import { KnowledgeBaseEntry, ResearchInput, ResearchReport, RankedArticle, AggregatedArticle, AuthorProfile, AuthorProfileInput, ResearchEntry, AuthorProfileEntry } from '../types';
import { useUI } from './UIContext';

const KNOWLEDGE_BASE_STORAGE_KEY = 'aiResearchKnowledgeBase';

// Fix: Define old entry types locally for migration logic.
interface OldResearchEntry {
  id: string;
  type: 'research';
  input: ResearchInput;
  report: ResearchReport;
}

interface OldAuthorEntry {
    id: string;
    type: 'author';
    input: AuthorProfileInput;
    profile: AuthorProfile;
}

const loadFromLocalStorage = (): KnowledgeBaseEntry[] => {
    try {
        const storedKB = localStorage.getItem(KNOWLEDGE_BASE_STORAGE_KEY);
        if (!storedKB) return [];
        const parsedKB = JSON.parse(storedKB);

        // Migration logic: Check if an entry is in the old format and convert it.
        return parsedKB.map((entry: any, index: number) => {
            if (entry.sourceType === 'research' || entry.sourceType === 'author') {
                return entry; // Already in new format
            }

            // Entry is in old format, migrate it
            const timestamp = entry.id ? parseInt(entry.id.split('-')[0], 10) : Date.now() + index;
            if (isNaN(timestamp)) {
                 console.warn("Could not parse timestamp from old entry ID:", entry.id);
                 return null;
            }

            if (entry.type === 'research') {
                const oldEntry = entry as OldResearchEntry;
                return {
                    id: oldEntry.id,
                    timestamp,
                    sourceType: 'research',
                    title: oldEntry.input.researchTopic,
                    articles: oldEntry.report?.rankedArticles || [],
                    input: oldEntry.input,
                    report: oldEntry.report
                } as ResearchEntry;
            }
            
            if (entry.type === 'author') {
                const oldEntry = entry as OldAuthorEntry;
                return {
                    id: oldEntry.id,
                    timestamp,
                    sourceType: 'author',
                    title: oldEntry.input.authorName,
                    articles: oldEntry.profile?.publications || [],
                    input: oldEntry.input,
                    profile: oldEntry.profile
                } as AuthorProfileEntry;
            }
            
            console.warn("Unknown entry type found during migration:", entry);
            return null;

        }).filter((entry: KnowledgeBaseEntry | null): entry is KnowledgeBaseEntry => entry !== null);

    } catch (error) {
        console.error("Failed to parse/migrate knowledge base from localStorage", error);
        return [];
    }
};

interface KnowledgeBaseContextType {
    knowledgeBase: KnowledgeBaseEntry[];
    uniqueArticles: AggregatedArticle[];
    getArticles: (sourceType?: 'all' | 'research' | 'author') => AggregatedArticle[];
    getRecentResearchEntries: (count: number) => ResearchEntry[];
    saveReport: (researchInput: ResearchInput, report: ResearchReport) => boolean;
    saveAuthorProfile: (input: AuthorProfileInput, profile: AuthorProfile) => boolean;
    clearKnowledgeBase: () => void;
    updateEntryTitle: (id: string, newTitle: string) => void;
    updateTags: (pmid: string, newTags: string[]) => void;
    deleteArticles: (pmids: string[]) => void;
    onMergeDuplicates: () => void;
    addKnowledgeBaseEntries: (entries: KnowledgeBaseEntry[]) => void;
    onPruneByRelevance: (score: number) => void;
    addSingleArticleReport: (article: RankedArticle) => void;
}

const KnowledgeBaseContext = createContext<KnowledgeBaseContextType | undefined>(undefined);

export const KnowledgeBaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBaseEntry[]>(loadFromLocalStorage);
    const { setNotification } = useUI();

    useEffect(() => {
        try {
            localStorage.setItem(KNOWLEDGE_BASE_STORAGE_KEY, JSON.stringify(knowledgeBase));
        } catch (error) {
            console.error("Failed to save knowledge base to localStorage", error);
            setNotification({ id: Date.now(), message: "Error: Could not save the Knowledge Base. Storage might be full.", type: 'error' });
        }
    }, [knowledgeBase, setNotification]);

    const showNotification = useCallback((message: string, type: 'success' | 'error' = 'success') => {
        setNotification({ id: Date.now(), message, type });
    }, [setNotification]);

    const saveEntry = useCallback((entry: Omit<KnowledgeBaseEntry, 'id' | 'timestamp'>) => {
        const timestamp = Date.now();
        const id = `${timestamp}-${Math.random()}`;
        const newEntry: KnowledgeBaseEntry = {
            ...entry,
            id,
            timestamp
        } as KnowledgeBaseEntry;

        setKnowledgeBase(prevKB => [...prevKB, newEntry]);
    }, []);

    const saveReport = useCallback((researchInput: ResearchInput, report: ResearchReport): boolean => {
        const entry: Omit<ResearchEntry, 'id' | 'timestamp'> = {
            sourceType: 'research',
            title: researchInput.researchTopic,
            articles: report.rankedArticles || [],
            input: researchInput,
            report
        };
        saveEntry(entry);
        showNotification("Report saved to Knowledge Base.");
        return true;
    }, [saveEntry, showNotification]);

    const saveAuthorProfile = useCallback((input: AuthorProfileInput, profile: AuthorProfile): boolean => {
        const entry: Omit<AuthorProfileEntry, 'id' | 'timestamp'> = {
            sourceType: 'author',
            title: profile.name,
            articles: profile.publications || [],
            input,
            profile,
        };
        saveEntry(entry);
        showNotification(`Profile for ${profile.name} saved to Knowledge Base.`);
        return true;
    }, [saveEntry, showNotification]);

    const clearKnowledgeBase = useCallback(() => {
        setKnowledgeBase([]);
        showNotification("Knowledge Base cleared.");
    }, [showNotification]);

    const updateEntryTitle = useCallback((id: string, newTitle: string) => {
        setKnowledgeBase(prevKB => prevKB.map(entry => {
            if (entry.id !== id) return entry;

            const updatedEntry = { ...entry, title: newTitle };
            if (updatedEntry.sourceType === 'research') {
                updatedEntry.input = { ...updatedEntry.input, researchTopic: newTitle };
            } else {
                updatedEntry.input = { ...updatedEntry.input, authorName: newTitle };
            }
            return updatedEntry;
        }));
        showNotification("Entry title updated successfully.");
    }, [showNotification]);

    const updateTags = useCallback((pmid: string, newTags: string[]) => {
        setKnowledgeBase(prevKB => prevKB.map(entry => {
            const updateArticle = (article: RankedArticle) => article.pmid === pmid ? { ...article, customTags: newTags } : article;
            
            const newArticles = (entry.articles || []).map(updateArticle);
            const updatedEntry = { ...entry, articles: newArticles };
            
            if (updatedEntry.sourceType === 'research') {
                updatedEntry.report = {
                    ...updatedEntry.report,
                    rankedArticles: (updatedEntry.report.rankedArticles || []).map(updateArticle)
                };
            } else { // 'author'
                updatedEntry.profile = {
                    ...updatedEntry.profile,
                    publications: (updatedEntry.profile.publications || []).map(updateArticle)
                };
            }
            return updatedEntry;
        }));
    }, []);

    const deleteArticles = useCallback((pmids: string[]) => {
        const pmidSet = new Set(pmids);
        setKnowledgeBase(prevKB => {
            const newKB = prevKB.map(entry => {
                const filterArticles = (articles: RankedArticle[]) => (articles || []).filter(article => !pmidSet.has(article.pmid));
                const newArticles = filterArticles(entry.articles);
                const updatedEntry = {...entry, articles: newArticles};

                if (updatedEntry.sourceType === 'research') {
                    updatedEntry.report.rankedArticles = filterArticles(updatedEntry.report.rankedArticles);
                } else {
                    updatedEntry.profile.publications = filterArticles(updatedEntry.profile.publications);
                }
                return updatedEntry;

            }).filter(entry => (entry.articles || []).length > 0);
            
            showNotification(`${pmids.length} article(s) deleted from Knowledge Base.`);
            return newKB;
        });
    }, [showNotification]);

    const getArticles = useCallback((filterType: 'all' | 'research' | 'author' = 'all'): AggregatedArticle[] => {
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

    const onMergeDuplicates = useCallback(() => {
        const articleMap = new Map<string, { article: RankedArticle, entryId: string }>();
        let duplicatesFound = 0;
        let articlesScanned = 0;

        knowledgeBase.forEach(entry => {
            if (Array.isArray(entry.articles)) {
                entry.articles.forEach(article => {
                    articlesScanned++;
                    const existing = articleMap.get(article.pmid);
                    if (existing) {
                        duplicatesFound++;
                        if ((article.relevanceScore || 0) > (existing.article.relevanceScore || 0)) {
                            articleMap.set(article.pmid, { article, entryId: entry.id });
                        }
                    } else {
                        articleMap.set(article.pmid, { article, entryId: entry.id });
                    }
                });
            }
        });

        if (duplicatesFound === 0) {
            showNotification("No duplicate articles found to merge.");
            return;
        }

        const newKnowledgeBase = knowledgeBase.map(entry => {
            const keptArticles = (entry.articles || []).filter(article => articleMap.get(article.pmid)?.entryId === entry.id);

            const updatedEntry = { ...entry, articles: keptArticles };
            if (updatedEntry.sourceType === 'research') {
                updatedEntry.report.rankedArticles = keptArticles;
            } else { // author
                updatedEntry.profile.publications = keptArticles;
            }
            return updatedEntry;
        }).filter(entry => (entry.articles || []).length > 0);

        setKnowledgeBase(newKnowledgeBase);
        showNotification(`Merged ${duplicatesFound} duplicate article entries. Kept the version with the highest relevance score for each.`);
    }, [knowledgeBase, showNotification]);


    const addKnowledgeBaseEntries = useCallback((entries: KnowledgeBaseEntry[]) => {
        const validEntries = entries.filter(entry => ('sourceType' in entry) && (entry.sourceType === 'research' || entry.sourceType === 'author'));
        setKnowledgeBase(kb => [...kb, ...validEntries]);
        showNotification("Knowledge base imported successfully.");
    }, [showNotification]);

    const addSingleArticleReport = useCallback((article: RankedArticle) => {
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
        saveReport(input, report);
        showNotification(`Article "${article.title.substring(0, 30)}..." added to Knowledge Base.`);
    }, [saveReport, showNotification]);

    const onPruneByRelevance = useCallback((pruneScore: number) => {
        const articlesBefore = uniqueArticles.length;

        const newKnowledgeBase = knowledgeBase.map(entry => {
            const keptArticles = (entry.articles || []).filter(article => article.relevanceScore >= pruneScore);
            
            const updatedEntry = { ...entry, articles: keptArticles };
            if (updatedEntry.sourceType === 'research') {
                updatedEntry.report.rankedArticles = keptArticles;
            } else { // author
                updatedEntry.profile.publications = keptArticles;
            }
            return updatedEntry;
        }).filter(entry => (entry.articles || []).length > 0);
        
        const articlesAfter = getArticles.call({knowledgeBase: newKnowledgeBase}, 'all').length;
        const articlesPruned = articlesBefore - articlesAfter;

        if (articlesPruned > 0) {
            setKnowledgeBase(newKnowledgeBase);
            showNotification(`${articlesPruned} article(s) with a score below ${pruneScore} were pruned.`);
        } else {
            showNotification(`No articles found with a score below ${pruneScore}.`, "error");
        }
    }, [knowledgeBase, showNotification, uniqueArticles, getArticles]);

    const getRecentResearchEntries = useCallback((count: number): ResearchEntry[] => {
        return knowledgeBase
            .filter((e): e is ResearchEntry => e.sourceType === 'research')
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, count);
    }, [knowledgeBase]);

    return (
        <KnowledgeBaseContext.Provider value={{
            knowledgeBase, uniqueArticles, getArticles, getRecentResearchEntries, saveReport, saveAuthorProfile, clearKnowledgeBase, updateEntryTitle,
            updateTags, deleteArticles, onMergeDuplicates, addKnowledgeBaseEntries, onPruneByRelevance, addSingleArticleReport
        }}>
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
