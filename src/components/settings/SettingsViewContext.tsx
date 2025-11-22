
import React, { createContext, useContext, ReactNode } from 'react';
import { useSettingsViewLogic } from './useSettingsViewLogic';

type SettingsViewContextType = ReturnType<typeof useSettingsViewLogic>;

const SettingsViewContext = createContext<SettingsViewContextType | undefined>(undefined);

export const SettingsViewProvider: React.FC<{
    children: ReactNode;
    value: SettingsViewContextType;
}> = ({ children, value }) => {
    return (
        <SettingsViewContext.Provider value={value}>
            {children}
        </SettingsViewContext.Provider>
    );
};

export const useSettingsView = () => {
    const context = useContext(SettingsViewContext);
    if (!context) {
        throw new Error('useSettingsView must be used within a SettingsViewProvider');
    }
    return context;
};
