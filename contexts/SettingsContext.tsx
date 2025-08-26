
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Settings } from '../types';

const SETTINGS_STORAGE_KEY = 'aiResearchSettings';

const defaultSettings: Settings = {
  theme: 'dark',
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
  },
  defaults: {
    maxArticlesToScan: 50,
    topNToSynthesize: 5,
    autoSaveReports: true,
  },
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
        // Merge stored settings with defaults to ensure all keys are present
        const parsed = JSON.parse(storedSettings);
        return { 
          ...defaultSettings, 
          ...parsed, 
          performance: {...defaultSettings.performance, ...parsed.performance},
          notifications: {...defaultSettings.notifications, ...parsed.notifications},
          ai: {...defaultSettings.ai, ...parsed.ai}, 
          defaults: {...defaultSettings.defaults, ...parsed.defaults}
        };
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