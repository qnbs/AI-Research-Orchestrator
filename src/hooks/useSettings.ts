import { useEffect, useCallback, useMemo } from 'react';
import type { Settings } from '../types';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { store } from '../store/store';
import {
  setSettings,
  updateSettings as updateSettingsAction,
  resetSettings as resetSettingsAction,
  setLoading,
} from '../store/slices/settingsSlice';
import { getSettings as getSettingsFromDb } from '../services/databaseService';

export interface UseSettingsValue {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings> | ((prevState: Settings) => Settings)) => void;
  resetSettings: () => void;
  isSettingsLoading: boolean;
}

/** Loads persisted settings into Redux once on mount (single source of truth: `settingsSlice`). */
export function SettingsHydrator(): null {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      dispatch(setLoading(true));
      try {
        const storedSettings = await getSettingsFromDb();
        if (cancelled || !storedSettings) return;
        const baseline = store.getState().settings.data;
        dispatch(setSettings({ ...baseline, ...storedSettings }));
      } catch (error) {
        console.error('Failed to load settings from IndexedDB', error);
      } finally {
        if (!cancelled) dispatch(setLoading(false));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  return null;
}

export function useSettings(): UseSettingsValue {
  const dispatch = useAppDispatch();
  const { data: settings, isLoading } = useAppSelector((state) => state.settings);

  const updateSettings = useCallback(
    (newSettings: Partial<Settings> | ((prevState: Settings) => Settings)) => {
      if (typeof newSettings === 'function') {
        const payload = newSettings(store.getState().settings.data);
        dispatch(setSettings(payload));
      } else {
        dispatch(updateSettingsAction(newSettings));
      }
    },
    [dispatch],
  );

  const resetSettings = useCallback(() => {
    dispatch(resetSettingsAction());
  }, [dispatch]);

  return useMemo(
    () => ({
      settings,
      updateSettings,
      resetSettings,
      isSettingsLoading: isLoading,
    }),
    [settings, updateSettings, resetSettings, isLoading],
  );
}
