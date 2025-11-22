
import React, { createContext, useContext, ReactNode, useMemo, useRef } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { 
    setCurrentView, 
    setNotification, 
    setIsSettingsDirty, 
    setPendingNavigation, 
    setIsCommandPaletteOpen,
    setIsPwaInstalled 
} from '../store/slices/uiSlice';

export type View = 'home' | 'orchestrator' | 'research' | 'authors' | 'journals' | 'knowledgeBase' | 'settings' | 'help' | 'dashboard' | 'history';

export interface BeforeInstallPromptEvent extends Event {
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
    const dispatch = useAppDispatch();
    const { 
        currentView, 
        notification, 
        isSettingsDirty, 
        pendingNavigation, 
        isCommandPaletteOpen,
        isPwaInstalled 
    } = useAppSelector(state => state.ui);

    // Refs for non-serializable state (DOM Events)
    const installPromptEventRef = useRef<BeforeInstallPromptEvent | null>(null);

    const value = useMemo(() => ({ 
        currentView, 
        setCurrentView: (view: View) => dispatch(setCurrentView(view)),
        notification, 
        setNotification: (notif: NotificationState | null) => dispatch(setNotification(notif)),
        isSettingsDirty, 
        setIsSettingsDirty: (dirty: boolean) => dispatch(setIsSettingsDirty(dirty)),
        pendingNavigation, 
        setPendingNavigation: (view: View | null) => dispatch(setPendingNavigation(view)),
        isCommandPaletteOpen, 
        setIsCommandPaletteOpen: (isOpen: boolean | ((isOpen: boolean) => boolean)) => {
            const val = typeof isOpen === 'function' ? isOpen(isCommandPaletteOpen) : isOpen;
            dispatch(setIsCommandPaletteOpen(val));
        },
        installPromptEvent: installPromptEventRef.current, 
        setInstallPromptEvent: (event: BeforeInstallPromptEvent | null) => {
            installPromptEventRef.current = event;
            // Force a re-render or update some dummy state if needed, 
            // or manage 'isInstallable' boolean in Redux.
        },
        isPwaInstalled, 
        setIsPwaInstalled: (val: boolean) => dispatch(setIsPwaInstalled(val))
    }), [
        currentView, 
        notification, 
        isSettingsDirty, 
        pendingNavigation, 
        isCommandPaletteOpen,
        isPwaInstalled,
        dispatch
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
