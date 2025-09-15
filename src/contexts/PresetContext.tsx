import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import type { Preset, ResearchInput } from '../types';
import { getAllPresets, addPreset as addPresetDb, removePreset as removePresetDb } from '../services/databaseService';

interface PresetContextType {
  presets: Preset[];
  addPreset: (name: string, settings: ResearchInput) => Promise<void>;
  removePreset: (id: string) => Promise<void>;
  arePresetsLoading: boolean;
}

const PresetContext = createContext<PresetContextType | undefined>(undefined);

export const PresetProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [presets, setPresets] = useState<Preset[]>([]);
    const [arePresetsLoading, setArePresetsLoading] = useState(true);

    useEffect(() => {
        const loadPresets = async () => {
            setArePresetsLoading(true);
            try {
                const storedPresets = await getAllPresets();
                setPresets(storedPresets);
            } catch (error) {
                console.error("Failed to load presets from IndexedDB", error);
            } finally {
                setArePresetsLoading(false);
            }
        };
        loadPresets();
    }, []);

    const addPreset = useCallback(async (name: string, settings: ResearchInput) => {
        const newPreset: Preset = {
            id: `${Date.now()}`,
            name,
            settings,
        };
        try {
            await addPresetDb(newPreset);
            setPresets(prev => [...prev, newPreset]);
        } catch (error) {
            console.error("Failed to save preset to IndexedDB", error);
        }
    }, []);

    const removePreset = useCallback(async (id: string) => {
        try {
            await removePresetDb(id);
            setPresets(prev => prev.filter(p => p.id !== id));
        } catch (error) {
            console.error("Failed to remove preset from IndexedDB", error);
        }
    }, []);

    const value = useMemo(() => ({ presets, addPreset, removePreset, arePresetsLoading }), [presets, addPreset, removePreset, arePresetsLoading]);

    return (
        <PresetContext.Provider value={value}>
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