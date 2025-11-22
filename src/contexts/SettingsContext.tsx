
import React, { createContext, useContext, ReactNode, useCallback, useMemo, useEffect } from 'react';
import type { Settings } from '../types';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { setSettings, updateSettings as updateSettingsAction, resetSettings as resetSettingsAction, setLoading } from '../store/slices/settingsSlice';
import { getSettings as getSettingsFromDb } from '../services/databaseService';

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings> | ((prevState: Settings) => Settings)) => void;
  resetSettings: () => void;
  isSettingsLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch();
  const { data: settings, isLoading } = useAppSelector(state => state.settings);

  useEffect(() => {
    const loadSettings = async () => {
      dispatch(setLoading(true));
      try {
        const storedSettings = await getSettingsFromDb();
        if (storedSettings) {
            // Merge logic is simpler here as we just dispatch
            dispatch(setSettings({ ...settings, ...storedSettings }));
        }
      } catch (error) {
        console.error("Failed to load settings from IndexedDB", error);
      } finally {
        dispatch(setLoading(false));
      }
    };
    loadSettings();
  }, [dispatch]);

  const updateSettings = useCallback((newSettings: Partial<Settings> | ((prevState: Settings) => Settings)) => {
      // Resolve function if passed
      let payload: Settings;
      if (typeof newSettings === 'function') {
          payload = newSettings(settings);
          dispatch(setSettings(payload));
      } else {
          dispatch(updateSettingsAction(newSettings));
      }
  }, [dispatch, settings]);

  const resetSettings = useCallback(() => {
    dispatch(resetSettingsAction());
  }, [dispatch]);

  const value = useMemo(() => ({ settings, updateSettings, resetSettings, isSettingsLoading: isLoading }), [settings, updateSettings, resetSettings, isLoading]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
