import { useMemo } from 'react';
import { useSyncExternalStore } from 'react';
import type { View, BeforeInstallPromptEvent } from '../types/ui';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  setCurrentView,
  setNotification,
  setIsSettingsDirty,
  setPendingNavigation,
  setIsCommandPaletteOpen,
} from '../store/slices/uiSlice';
import {
  getInstallPromptStateSnapshot,
  setInstallPromptEvent as setInstallPromptGlobal,
  setIsPwaInstalled as setIsPwaInstalledGlobal,
  subscribeInstallPrompt,
} from '../lib/installPromptStore';

interface NotificationState {
  id: number;
  message: string;
  type: 'success' | 'error';
}

export interface UseUIValue {
  currentView: View;
  setCurrentView: (view: View) => void;
  /** Navigate with the unsaved-settings confirmation used by chrome. */
  requestViewChange: (view: View) => void;
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

export function useUI(): UseUIValue {
  const dispatch = useAppDispatch();
  const { currentView, notification, isSettingsDirty, pendingNavigation, isCommandPaletteOpen } =
    useAppSelector((state) => state.ui);

  const installPromptState = useSyncExternalStore(
    subscribeInstallPrompt,
    getInstallPromptStateSnapshot,
    getInstallPromptStateSnapshot,
  );

  return useMemo(
    () => ({
      currentView,
      setCurrentView: (view: View) => dispatch(setCurrentView(view)),
      requestViewChange: (view: View) => {
        if (isSettingsDirty) {
          dispatch(setPendingNavigation(view));
        } else {
          dispatch(setCurrentView(view));
        }
      },
      notification,
      setNotification: (n: NotificationState | null) => dispatch(setNotification(n)),
      isSettingsDirty,
      setIsSettingsDirty: (dirty: boolean) => dispatch(setIsSettingsDirty(dirty)),
      pendingNavigation,
      setPendingNavigation: (view: View | null) => dispatch(setPendingNavigation(view)),
      isCommandPaletteOpen,
      setIsCommandPaletteOpen: (isOpen: boolean | ((isOpen: boolean) => boolean)) => {
        const val = typeof isOpen === 'function' ? isOpen(isCommandPaletteOpen) : isOpen;
        dispatch(setIsCommandPaletteOpen(val));
      },
      installPromptEvent: installPromptState.event,
      setInstallPromptEvent: setInstallPromptGlobal,
      isPwaInstalled: installPromptState.isPwaInstalled,
      setIsPwaInstalled: setIsPwaInstalledGlobal,
    }),
    [
      currentView,
      notification,
      isSettingsDirty,
      pendingNavigation,
      isCommandPaletteOpen,
      installPromptState,
      dispatch,
    ],
  );
}
