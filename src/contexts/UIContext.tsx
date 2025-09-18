import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';

export type View = 'home' | 'orchestrator' | 'research' | 'authors' | 'journals' | 'knowledgeBase' | 'settings' | 'help' | 'dashboard' | 'history';

// This interface is not part of the standard DOM library yet.
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

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
    isCommandPaletteOpen: boolean;
    setIsCommandPaletteOpen: (isOpen: boolean | ((isOpen: boolean) => boolean)) => void;
    installPromptEvent: BeforeInstallPromptEvent | null;
    setInstallPromptEvent: (event: BeforeInstallPromptEvent | null) => void;
    isPwaInstalled: boolean;
    setIsPwaInstalled: (installed: boolean) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentView, setCurrentView] = useState<View>('home');
    const [notification, setNotification] = useState<NotificationState | null>(null);
    const [isSettingsDirty, setIsSettingsDirty] = useState(false);
    const [pendingNavigation, setPendingNavigation] = useState<View | null>(null);
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
    const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
    const [isPwaInstalled, setIsPwaInstalled] = useState(false);
    
    const value = useMemo(() => ({ 
        currentView, setCurrentView,
        notification, setNotification,
        isSettingsDirty, setIsSettingsDirty,
        pendingNavigation, setPendingNavigation,
        isCommandPaletteOpen, setIsCommandPaletteOpen,
        installPromptEvent, setInstallPromptEvent,
        isPwaInstalled, setIsPwaInstalled
    }), [
        currentView, 
        notification, 
        isSettingsDirty, 
        pendingNavigation, 
        isCommandPaletteOpen,
        installPromptEvent,
        isPwaInstalled
    ]);


    return (
        <UIContext.Provider value={value}>
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
