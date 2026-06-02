import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { deepMergeRecords } from '../../lib/deepMerge';
import type { Settings, CyberTheme } from '../../types';
import { CSV_EXPORT_COLUMNS } from '../../types';

/** Baseline settings (also used by tests and hydrate merge). */
export const defaultSettings: Settings = {
  theme: 'dark' as CyberTheme,
  appLanguage: 'en',
  appearance: {
    density: 'comfortable',
    fontFamily: 'Inter',
    customColors: {
      enabled: false,
      primary: '#2f81f7',
      secondary: '#388bfd',
      accent: '#1f6feb',
    },
  },
  performance: {
    enableAnimations: true,
  },
  notifications: {
    position: 'bottom-right',
    duration: 5000,
  },
  ai: {
    model: 'gemini-2.5-flash',
    customPreamble: '',
    temperature: 0.2,
    aiLanguage: 'English',
    aiPersona: 'Neutral Scientist',
    researchAssistant: {
      autoFetchSimilar: true,
      autoFetchOnline: true,
      authorSearchLimit: 100,
    },
    enableTldr: true,
  },
  defaults: {
    maxArticlesToScan: 50,
    topNToSynthesize: 5,
    autoSaveReports: true,
    defaultDateRange: '5',
    defaultSynthesisFocus: 'overview',
    defaultArticleTypes: ['Randomized Controlled Trial', 'Systematic Review'],
  },
  export: {
    pdf: {
      includeCoverPage: true,
      preparedFor: '',
      includeSynthesis: true,
      includeInsights: true,
      includeQueries: false,
      includeToc: true,
      includeHeader: true,
      includeFooter: true,
    },
    csv: {
      columns: [...CSV_EXPORT_COLUMNS],
      delimiter: ',',
    },
    citation: {
      includeAbstract: true,
      includeKeywords: true,
      includeTags: true,
      includePmcid: true,
    },
  },
  knowledgeBase: {
    defaultView: 'grid',
    articlesPerPage: 20,
    defaultSort: 'relevance',
  },
  hasCompletedOnboarding: false,
};

interface SettingsState {
  data: Settings;
  isLoading: boolean;
}

const initialState: SettingsState = {
  data: defaultSettings,
  isLoading: true,
};

export const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setSettings: (state, action: PayloadAction<Settings>) => {
      // Immer handles immutability
      state.data = action.payload;
      state.isLoading = false;
    },
    updateSettings: (state, action: PayloadAction<Partial<Settings>>) => {
      state.data = deepMergeRecords(
        state.data as Record<string, unknown>,
        action.payload as Record<string, unknown>,
      ) as unknown as Settings;
    },
    resetSettings: (state) => {
      state.data = defaultSettings;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const { setSettings, updateSettings, resetSettings, setLoading } = settingsSlice.actions;
export default settingsSlice.reducer;
