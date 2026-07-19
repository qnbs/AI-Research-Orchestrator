import { useEffect, useCallback, useMemo } from 'react';
import type { Settings } from '../types';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { store } from '../store/store';
import {
  defaultSettings,
  setSettings,
  updateSettings as updateSettingsAction,
  resetSettings as resetSettingsAction,
  setLoading,
} from '../store/slices/settingsSlice';
import {
  getSettings as getSettingsFromDb,
  saveSettings as saveSettingsToDb,
} from '../services/databaseService';
import { saveNcbiApiKey } from '../services/apiKeyService';
import type { AIProviderSelection } from '../services/providers/types';
import { getProviderMeta } from '../services/providers/provider';

const VALID_PROVIDERS: AIProviderSelection[] = [
  'gemini',
  'openai',
  'anthropic',
  'ollama',
  'heuristic',
];

function isValidProvider(value: unknown): value is AIProviderSelection {
  return typeof value === 'string' && VALID_PROVIDERS.includes(value as AIProviderSelection);
}

export interface UseSettingsValue {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings> | ((prevState: Settings) => Settings)) => void;
  resetSettings: () => void;
  isSettingsLoading: boolean;
}

function mergeSettingsWithDefaults(
  storedSettings: Partial<Settings>,
  baseline: Settings,
): Settings {
  const storedAi = storedSettings.ai as Partial<Settings['ai']> | undefined;
  // Resolve effective provider first; fall back to gemini for invalid values
  const effectiveProvider = isValidProvider(storedAi?.provider)
    ? storedAi.provider
    : (baseline.ai.provider ?? 'gemini');
  const providerMeta = getProviderMeta(effectiveProvider);

  // Validate model against resolved provider; use provider's default if incompatible
  const storedModel = storedAi?.model;
  const isModelValidForProvider =
    typeof storedModel === 'string' &&
    (providerMeta.modelSuggestions.includes(storedModel) ||
      storedModel === providerMeta.defaultModel);
  const model = isModelValidForProvider
    ? storedModel
    : (baseline.ai.model ?? providerMeta.defaultModel);

  const mergedAi: Settings['ai'] = {
    ...baseline.ai,
    ...(storedAi ?? {}),
    provider: effectiveProvider,
    model,
    ncbiApiKey: '',
    researchAssistant: {
      ...baseline.ai.researchAssistant,
      ...(storedAi?.researchAssistant ?? {}),
    },
  };
  return {
    ...baseline,
    ...storedSettings,
    ai: mergedAi,
  };
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
        const legacyNcbiApiKey = storedSettings.ai?.ncbiApiKey?.trim();
        if (legacyNcbiApiKey) {
          await saveNcbiApiKey(legacyNcbiApiKey);
        }
        const baseline = store.getState().settings.data ?? defaultSettings;
        const mergedSettings = mergeSettingsWithDefaults(storedSettings, baseline);
        dispatch(setSettings(mergedSettings));
        if (legacyNcbiApiKey) {
          await saveSettingsToDb(mergedSettings);
        }
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
