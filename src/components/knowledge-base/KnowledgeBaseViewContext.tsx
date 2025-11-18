
import React, { createContext, useContext, ReactNode } from 'react';
import { useKnowledgeBaseLogic } from './useKnowledgeBaseLogic';

type KnowledgeBaseViewContextType = ReturnType<typeof useKnowledgeBaseLogic>;

const KnowledgeBaseViewContext = createContext<KnowledgeBaseViewContextType | undefined>(undefined);

export const KnowledgeBaseViewProvider: React.FC<{
    children: ReactNode;
    value: KnowledgeBaseViewContextType;
}> = ({ children, value }) => {
    return (
        <KnowledgeBaseViewContext.Provider value={value}>
            {children}
        </KnowledgeBaseViewContext.Provider>
    );
};

export const useKnowledgeBaseView = () => {
    const context = useContext(KnowledgeBaseViewContext);
    if (!context) {
        throw new Error('useKnowledgeBaseView must be used within a KnowledgeBaseViewProvider');
    }
    return context;
};
