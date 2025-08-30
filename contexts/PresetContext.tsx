import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Preset, ResearchInput } from '../types';

const PRESETS_STORAGE_KEY = 'aiResearchPresets';

interface PresetContextType {
  presets: Preset[];
  addPreset: (name: string, settings: ResearchInput) => void;
  removePreset: (id: string) => void;
}

const PresetContext = createContext<PresetContextType | undefined>(undefined);

export const PresetProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [presets, setPresets] = useState<Preset[]>(() => {
        try {
            const storedPresets = localStorage.getItem(PRESETS_STORAGE_KEY);
            return storedPresets ? JSON.parse(storedPresets) : [];
        } catch (error) {
            console.error("Failed to parse presets from localStorage", error);
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
        } catch (error) {
            console.error("Failed to save presets to localStorage", error);
        }
    }, [presets]);

    const addPreset = (name: string, settings: ResearchInput) => {
        const newPreset: Preset = {
            id: `${Date.now()}`,
            name,
            settings,
        };
        setPresets(prev => [...prev, newPreset]);
    };

    const removePreset = (id: string) => {
        setPresets(prev => prev.filter(p => p.id !== id));
    };

    return (
        <PresetContext.Provider value={{ presets, addPreset, removePreset }}>
            {children}
        </PresetContext.Provider>
    );
};

export const usePresets = (): PresetContextType => {
    const context = useContext(PresetContext);
    if (context === undefined) {
        throw new Error('usePresets must be used within a PresetProvider');
    }
    return context;
};