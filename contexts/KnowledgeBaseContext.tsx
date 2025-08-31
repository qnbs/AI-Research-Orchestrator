import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { KnowledgeBaseEntry, ResearchInput, ResearchReport, RankedArticle, AggregatedArticle } from '../types';
import { useUI } from './UIContext';

const KNOWLEDGE_BASE_STORAGE_KEY = 'aiResearchKnowledgeBase';

const loadFromLocalStorage = (): KnowledgeBaseEntry[] => {
    try {
        const storedKB = localStorage.getItem(KNOWLEDGE_BASE_STORAGE_KEY);
        if (!storedKB) return [];
        const parsedKB = JSON.parse(storedKB);
        return parsedKB.map((entry: any, index: number) => ({
            ...entry,
            id: entry.id || `${Date.now()}-${index}`
        }));
    } catch (error) {
        console.error("Failed to parse knowledge base from localStorage", error);
        return [];
    }
};

interface KnowledgeBaseContextType {
    knowledgeBase: KnowledgeBaseEntry[];
    uniqueArticles: AggregatedArticle[];
    saveReport: (researchInput: ResearchInput, report: ResearchReport) => boolean;
    clearKnowledgeBase: () => void;
    updateReportTitle: (id: string, newTitle: string) => void;
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

    const saveReport = useCallback((researchInput: ResearchInput, report: ResearchReport): boolean => {
        if (knowledgeBase.some(entry => JSON.stringify(entry.input) === JSON.stringify(researchInput))) {
            showNotification("This report has already been saved.", "error");
            return false;
        }
        const newEntry: KnowledgeBaseEntry = { 
            id: `${Date.now()}-${Math.random()}`,
            input: researchInput, 
            report 
        };
        setKnowledgeBase(prevKB => [...prevKB, newEntry]);
        showNotification("Report saved to Knowledge Base.");
        return true;
    }, [knowledgeBase, showNotification]);

    const clearKnowledgeBase = useCallback(() => {
        setKnowledgeBase([]);
        showNotification("Knowledge Base cleared.");
    }, [showNotification]);

    const updateReportTitle = useCallback((id: string, newTitle: string) => {
        setKnowledgeBase(prevKB => prevKB.map(entry => entry.id === id ? { ...entry, input: { ...entry.input, researchTopic: newTitle } } : entry));
        showNotification("Report title updated successfully.");
    }, [showNotification]);

    const updateTags = useCallback((pmid: string, newTags: string[]) => {
        setKnowledgeBase(prevKB => prevKB.map(entry => ({
            ...entry,
            report: {
                ...entry.report,
                rankedArticles: entry.report.rankedArticles.map(article =>
                    article.pmid === pmid ? { ...article, customTags: newTags } : article
                )
            }
        })));
    }, []);

    const deleteArticles = useCallback((pmids: string[]) => {
        const pmidSet = new Set(pmids);
        setKnowledgeBase(prevKB => {
            const newKB = prevKB.map(entry => ({
                ...entry,
                report: {
                    ...entry.report,
                    rankedArticles: entry.report.rankedArticles.filter(article => !pmidSet.has(article.pmid))
                }
            })).filter(entry => entry.report.rankedArticles.length > 0);
            showNotification(`${pmids.length} article(s) deleted from Knowledge Base.`);
            return newKB;
        });
    }, [showNotification]);

    const onMergeDuplicates = useCallback(() => {
        const articleMap = new Map<string, RankedArticle>();
        let duplicatesFound = 0;
        
        knowledgeBase.forEach(entry => {
            entry.report.rankedArticles.forEach(article => {
                if (articleMap.has(article.pmid)) {
                    duplicatesFound++;
                    if (article.relevanceScore > (articleMap.get(article.pmid)?.relevanceScore || 0)) {
                        articleMap.set(article.pmid, article);
                    }
                } else {
                    articleMap.set(article.pmid, article);
                }
            });
        });

        if (duplicatesFound === 0) {
            showNotification("No duplicate articles found to merge.");
            return;
        }
        
        const newKnowledgeBase = knowledgeBase.map(entry => ({
            ...entry,
            report: {
                ...entry.report,
                rankedArticles: entry.report.rankedArticles.filter(article => articleMap.get(article.pmid) === article)
            }
        })).filter(entry => entry.report.rankedArticles.length > 0);

        setKnowledgeBase(newKnowledgeBase);
        showNotification(`Merged ${duplicatesFound} duplicate article entries. Kept the version with the highest relevance score for each.`);
    }, [knowledgeBase, showNotification]);

    const addKnowledgeBaseEntries = useCallback((entries: KnowledgeBaseEntry[]) => {
        setKnowledgeBase(kb => [...kb, ...entries]);
        showNotification("Knowledge base imported successfully.");
    }, [showNotification]);

    const addSingleArticleReport = useCallback((article: RankedArticle) => {
        const newEntry: KnowledgeBaseEntry = {
            id: `${Date.now()}-${Math.random()}`,
            input: {
                researchTopic: `Single Article: ${article.title}`,
                dateRange: 'any',
                articleTypes: [],
                synthesisFocus: 'overview',
                maxArticlesToScan: 1,
                topNToSynthesize: 1,
            },
            report: {
                generatedQueries: [],
                rankedArticles: [article],
                synthesis: `This is a single-article report for "${article.title}".`,
                aiGeneratedInsights: [],
                overallKeywords: article.keywords.map(kw => ({ keyword: kw, frequency: 1 })),
            }
        };
        setKnowledgeBase(prevKB => [...prevKB, newEntry]);
        showNotification(`Article "${article.title.substring(0, 30)}..." added to Knowledge Base.`);
    }, [showNotification]);


    const uniqueArticles = useMemo(() => {
        const articleMap = new Map<string, AggregatedArticle>();
        knowledgeBase.forEach(entry => {
            entry.report.rankedArticles.forEach(article => {
                if (!articleMap.has(article.pmid) || article.relevanceScore > (articleMap.get(article.pmid)?.relevanceScore || 0)) {
                    articleMap.set(article.pmid, { ...article, sourceReportTopic: entry.input.researchTopic });
                }
            });
        });
        return Array.from(articleMap.values());
    }, [knowledgeBase]);

    const onPruneByRelevance = useCallback((pruneScore: number) => {
        const articlesBefore = uniqueArticles.length;
        
        const newKnowledgeBase = knowledgeBase.map(entry => ({
            ...entry,
            report: {
                ...entry.report,
                rankedArticles: entry.report.rankedArticles.filter(article => article.relevanceScore >= pruneScore)
            }
        })).filter(entry => entry.report.rankedArticles.length > 0);

        const articlesAfter = newKnowledgeBase.flatMap(e => e.report.rankedArticles).reduce((acc, article) => acc.add(article.pmid), new Set()).size;
        const articlesPruned = articlesBefore - articlesAfter;

        if (articlesPruned > 0) {
            setKnowledgeBase(newKnowledgeBase);
            showNotification(`${articlesPruned} article(s) with a score below ${pruneScore} were pruned.`);
        } else {
            showNotification(`No articles found with a score below ${pruneScore}.`, "error");
        }
    }, [knowledgeBase, showNotification, uniqueArticles]);

    return (
        <KnowledgeBaseContext.Provider value={{
            knowledgeBase, uniqueArticles, saveReport, clearKnowledgeBase, updateReportTitle,
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
