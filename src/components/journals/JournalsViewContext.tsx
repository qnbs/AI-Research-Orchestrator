
import React, { createContext, useContext, ReactNode } from 'react';
import { useJournalsViewLogic } from './useJournalsViewLogic';

type JournalsViewContextType = ReturnType<typeof useJournalsViewLogic>;

const JournalsViewContext = createContext<JournalsViewContextType | undefined>(undefined);

export const JournalsViewProvider: React.FC<{
    children: ReactNode;
    value: JournalsViewContextType;
}> = ({ children, value }) => {
    return (
        <JournalsViewContext.Provider value={value}>
            {children}
        </JournalsViewContext.Provider>
    );
};

export const useJournalsView = () => {
    const context = useContext(JournalsViewContext);
    if (!context) {
        throw new Error('useJournalsView must be used within a JournalsViewProvider');
    }
    return context;
};
