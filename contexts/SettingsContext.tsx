import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Settings } from '../types';
import { CSV_EXPORT_COLUMNS } from '../types';


const SETTINGS_STORAGE_KEY = 'aiResearchSettings';

const defaultSettings: Settings = {
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
  }
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
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings> | ((prevState: Settings) => Settings)) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        // Deep merge stored settings with defaults to ensure all keys are present
        const mergedSettings = deepMerge(defaultSettings, parsed);
        
        // Enforce compliance with the current recommended model
        if (mergedSettings.ai?.model && mergedSettings.ai.model !== 'gemini-2.5-flash') {
          mergedSettings.ai.model = 'gemini-2.5-flash';
        }
        return mergedSettings;
      }
    } catch (error)
    {
      console.error("Failed to parse settings from localStorage", error);
    }
    return defaultSettings;
  });

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error("Failed to save settings to localStorage", error);
    }
  }, [settings]);

  const updateSettings = (newSettings: Partial<Settings> | ((prevState: Settings) => Settings)) => {
      setSettings(prevSettings => {
          if (typeof newSettings === 'function') {
              return newSettings(prevSettings);
          }
          return { ...prevSettings, ...newSettings };
      });
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
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