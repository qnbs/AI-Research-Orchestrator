import React, { createContext, useContext, ReactNode } from 'react';
import { useKnowledgeBase as useKnowledgeBaseImpl } from '../hooks/useKnowledgeBase';
import { AggregatedArticle, KnowledgeBaseEntry } from '../types';

interface KnowledgeBaseContextType {
    knowledgeBase: KnowledgeBaseEntry[];
    uniqueArticles: AggregatedArticle[];
    saveReport: (researchInput: any, report: any) => boolean;
    clearKnowledgeBase: () => void;
    updateReportTitle: (id: string, newTitle: string) => void;
    updateTags: (pmid: string, newTags: string[]) => void;
    deleteArticles: (pmids: string[]) => void;
    onMergeDuplicates: () => void;
    addKnowledgeBaseEntries: (entries: KnowledgeBaseEntry[]) => void;
    onPruneByRelevance: (score: number) => void;
}

const KnowledgeBaseContext = createContext<KnowledgeBaseContextType | undefined>(undefined);

export const KnowledgeBaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const knowledgeBaseHookValue = useKnowledgeBaseImpl();

    return (
        <KnowledgeBaseContext.Provider value={knowledgeBaseHookValue}>
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