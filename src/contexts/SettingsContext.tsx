
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import type { AppSettings } from '@/types';
import { CSV_EXPORT_COLUMNS } from '@/types';
import { getSettings as getSettingsFromDb, saveSettings as saveSettingsToDb } from '@/services/databaseService';

const defaultSettings: AppSettings = {
  theme: 'dark',
  appearance: {
    density: 'comfortable',
    fontFamily: 'Inter',
    customColors: {
        enabled: false,
        primary: '#2f81f7',
        secondary: '#388bfd',
        accent: '#1f6feb',
    }
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
    }
  },
  knowledgeBase: {
      defaultView: 'grid',
      articlesPerPage: 20,
      defaultSort: 'relevance',
  },
  hasCompletedOnboarding: false,
};

const isObject = (item: any): item is object => {
    return (item && typeof item === 'object' && !Array.isArray(item));
};

const deepMerge = (target: any, source: any): any => {
    let output = { ...target };
    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
            if (isObject(source[key])) {
                if (!(key in target)) {
                    output = { ...output, [key]: source[key] };
                } else {
                    output[key] = deepMerge(target[key], source[key]);
                }
            } else {
                output = { ...output, [key]: source[key] };
            }
        });
    }
    return output;
};


interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings> | ((prevState: AppSettings) => AppSettings)) => void;
  resetSettings: () => void;
  isSettingsLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isSettingsLoading, setIsSettingsLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      setIsSettingsLoading(true);
      try {
        const storedSettings = await getSettingsFromDb();
        if (storedSettings) {
          const mergedSettings = deepMerge(defaultSettings, storedSettings);
          
          if (mergedSettings.ai?.model && mergedSettings.ai.model !== 'gemini-2.5-flash') {
            mergedSettings.ai.model = 'gemini-2.5-flash';
          }
          setSettings(mergedSettings);
        } else {
          await saveSettingsToDb(defaultSettings);
          setSettings(defaultSettings);
        }
      } catch (error) {
        console.error("Failed to load settings from IndexedDB", error);
        setSettings(defaultSettings);
      } finally {
        setIsSettingsLoading(false);
      }
    };
    loadSettings();
  }, []);

  const updateSettings = useCallback((newSettings: Partial<AppSettings> | ((prevState: AppSettings) => AppSettings)) => {
      setSettings(prevSettings => {
          const updated = typeof newSettings === 'function' ? newSettings(prevSettings) : deepMerge(prevSettings, newSettings);
          saveSettingsToDb(updated).catch(error => console.error("Failed to save settings to IndexedDB", error));
          return updated;
      });
  }, []);

  const resetSettings = useCallback(async () => {
    await saveSettingsToDb(defaultSettings)
    setSettings(defaultSettings);
  }, []);

  const value = useMemo(() => ({ settings, updateSettings, resetSettings, isSettingsLoading }), [settings, updateSettings, resetSettings, isSettingsLoading]);

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
