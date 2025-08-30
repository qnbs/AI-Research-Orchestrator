import React, { createContext, useContext, useState, ReactNode } from 'react';

export type View = 'orchestrator' | 'research' | 'knowledgeBase' | 'settings' | 'help' | 'dashboard' | 'history';

interface NotificationState {
  id: number;
  message: string;
  type: 'success' | 'error';
}

interface UIContextType {
    currentView: View;
    setCurrentView: (view: View) => void;
    notification: NotificationState | null;
    setNotification: (notification: NotificationState | null) => void;
    isSettingsDirty: boolean;
    setIsSettingsDirty: (isDirty: boolean) => void;
    pendingNavigation: View | null;
    setPendingNavigation: (view: View | null) => void;
    showOnboarding: boolean;
    setShowOnboarding: (show: boolean) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentView, setCurrentView] = useState<View>('orchestrator');
    const [notification, setNotification] = useState<NotificationState | null>(null);
    const [isSettingsDirty, setIsSettingsDirty] = useState(false);
    const [pendingNavigation, setPendingNavigation] = useState<View | null>(null);
    const [showOnboarding, setShowOnboarding] = useState(() => {
        try {
            return localStorage.getItem('hasCompletedOnboarding') !== 'true';
        } catch {
            return true;
        }
    });

    return (
        <UIContext.Provider value={{ 
            currentView, setCurrentView,
            notification, setNotification,
            isSettingsDirty, setIsSettingsDirty,
            pendingNavigation, setPendingNavigation,
            showOnboarding, setShowOnboarding
        }}>
            {children}
        </UIContext.Provider>
    );
};

export const useUI = (): UIContextType => {
    const context = useContext(UIContext);
    if (context === undefined) {
        throw new Error('useUI must be used within a UIProvider');
    }
    return context;
};
