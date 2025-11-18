
import React, { createContext, useContext, ReactNode } from 'react';
import { useAuthorsViewLogic } from './useAuthorsViewLogic';

type AuthorsViewContextType = ReturnType<typeof useAuthorsViewLogic>;

const AuthorsViewContext = createContext<AuthorsViewContextType | undefined>(undefined);

export const AuthorsViewProvider: React.FC<{
    children: ReactNode;
    value: AuthorsViewContextType;
}> = ({ children, value }) => {
    return (
        <AuthorsViewContext.Provider value={value}>
            {children}
        </AuthorsViewContext.Provider>
    );
};

export const useAuthorsView = () => {
    const context = useContext(AuthorsViewContext);
    if (!context) {
        throw new Error('useAuthorsView must be used within a AuthorsViewProvider');
    }
    return context;
};
