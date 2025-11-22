
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { usePresets } from '../../contexts/PresetContext';
import { useKnowledgeBase } from '../../contexts/KnowledgeBaseContext';
import { useUI } from '../../contexts/UIContext';
import { Settings, Preset, CSV_EXPORT_COLUMNS } from '../../types';
import { db } from '../../services/databaseService';
import { useTranslation } from '../../hooks/useTranslation';
import { exportHistoryToJson, exportKnowledgeBaseToJson } from '../../services/exportService';

const isObject = (item: any): item is object => {
    return (item && typeof item === 'object' && !Array.isArray(item));
};

export const deepMerge = (target: any, source: any) => {
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

export type SettingsTab = 'general' | 'ai' | 'knowledgeBase' | 'export' | 'data';

export const useSettingsViewLogic = (
    onClearKnowledgeBase: () => void,
    resetToken: number,
    onNavigateToHelpTab: (tab: 'about' | 'faq') => void
) => {
    const { settings, updateSettings, resetSettings } = useSettings();
    const { knowledgeBase, uniqueArticles, onMergeDuplicates, addKnowledgeBaseEntries, onPruneByRelevance } = useKnowledgeBase();
    const { setNotification, setIsSettingsDirty, installPromptEvent, setInstallPromptEvent, isPwaInstalled } = useUI();
    const { presets, removePreset } = usePresets();
    const { t } = useTranslation();

    const [tempSettings, setTempSettings] = useState(settings);
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');
    const [modalState, setModalState] = useState<{ type: 'clear' | 'reset' | 'import' | 'prune' | 'merge' | 'confirmModelChange' | 'deletePreset', data?: any } | null>(null);
    const [pruneScore, setPruneScore] = useState(20);
    const [errors, setErrors] = useState<{ formDefaults?: string }>({});
    const [storageUsage, setStorageUsage] = useState({ totalMB: '0.00', percentage: '0' });
    const [isProcessing, setIsProcessing] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const settingsFileInputRef = useRef<HTMLInputElement>(null);
    const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    useEffect(() => {
        const calculateUsage = async () => {
            if (navigator.storage && navigator.storage.estimate) {
                const { usage, quota } = await navigator.storage.estimate();
                if (usage && quota && isMounted.current) {
                    const totalMB = (usage / (1024 * 1024)).toFixed(2);
                    const percentage = Math.min(100, (usage / quota) * 100).toFixed(1);
                    setStorageUsage({ totalMB, percentage });
                    return;
                }
            }
            // Fallback for browsers without StorageManager API
            const kbSize = (await db.knowledgeBaseEntries.count()) * 2048; // Estimate 2KB per entry
            const totalBytes = kbSize;
            const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
            const percentage = Math.min(100, (totalBytes / (5 * 1024 * 1024)) * 100).toFixed(1); // Assume 5MB limit
            if (isMounted.current) {
                setStorageUsage({ totalMB, percentage });
            }
        };
        calculateUsage();
    }, [knowledgeBase, presets]);

    const articlesToPruneCount = useMemo(() => {
        if (!uniqueArticles) return 0;
        return uniqueArticles.filter(a => a.relevanceScore < pruneScore).length;
    }, [pruneScore, uniqueArticles]);
    
    useEffect(() => {
      setTempSettings(settings);
    }, [settings]);

    const isDirty = useMemo(() => JSON.stringify(settings) !== JSON.stringify(tempSettings), [settings, tempSettings]);

    useEffect(() => {
        setIsSettingsDirty(isDirty);
    }, [isDirty, setIsSettingsDirty]);

    useEffect(() => {
        if (resetToken > 0) {
            setTempSettings(settings);
        }
    }, [resetToken, settings]);

    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (isDirty) {
                event.preventDefault();
                event.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isDirty]);

    useEffect(() => {
        const maxScan = tempSettings.defaults.maxArticlesToScan;
        const topN = tempSettings.defaults.topNToSynthesize;

        if (isNaN(topN) || isNaN(maxScan)) {
            setErrors(e => { const { formDefaults, ...rest } = e; return rest; });
            return;
        }
        
        if (topN > maxScan) {
            setErrors(e => ({ ...e, formDefaults: 'Default synthesize count cannot exceed scan count.' }));
        } else {
            setErrors(e => { const { formDefaults, ...rest } = e; return rest; });
        }
    }, [tempSettings.defaults.topNToSynthesize, tempSettings.defaults.maxArticlesToScan]);

    const hasErrors = useMemo(() => Object.keys(errors).length > 0, [errors]);

    const handleSave = useCallback(() => {
        if (hasErrors) {
            setNotification({id: Date.now(), message: "Please fix the errors before saving.", type: 'error'});
            return;
        }
        updateSettings(tempSettings);
        setNotification({id: Date.now(), message: "Settings saved successfully!", type: 'success'});
    }, [hasErrors, tempSettings, updateSettings, setNotification]);
    
    const handleCancel = useCallback(() => {
        setTempSettings(settings);
    }, [settings]);
    
    const handleExportHistory = useCallback(() => {
        if (knowledgeBase.length === 0) {
            setNotification({id: Date.now(), message: "History is empty. Nothing to export.", type: 'error'});
            return;
        }
        exportHistoryToJson(knowledgeBase);
        setNotification({id: Date.now(), message: "History exported successfully.", type: 'success'});
    }, [knowledgeBase, setNotification]);

    const handleExportKnowledgeBase = useCallback(() => {
        if (uniqueArticles.length === 0) {
            setNotification({id: Date.now(), message: "Knowledge Base is empty. Nothing to export.", type: 'error'});
            return;
        }
        exportKnowledgeBaseToJson(uniqueArticles);
        setNotification({id: Date.now(), message: "Full Knowledge Base (all unique articles) exported successfully.", type: 'success'});
    }, [uniqueArticles, setNotification]);

    const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedData = JSON.parse(event.target?.result as string);
                const dataToImport = importedData.data ? importedData.data : importedData;

                if (Array.isArray(dataToImport) && dataToImport.every(item => 'sourceType' in item)) {
                    setModalState({ type: 'import', data: dataToImport });
                } else {
                    throw new Error("Invalid file format. The file must be an array of Knowledge Base entries.");
                }
            } catch (error) {
                 setNotification({id: Date.now(), message: `Import failed: ${error instanceof Error ? error.message : "Could not read file."}`, type: 'error'});
            } finally {
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        };
        reader.readAsText(file);
    }, [setNotification]);

    const handleExportSettings = useCallback(() => {
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(settings))}`;
        const link = document.createElement("a");
        link.href = jsonString;
        const date = new Date().toISOString().split('T')[0];
        link.download = `ai_research_orchestration_settings_${date}.json`;
        link.click();
        setNotification({id: Date.now(), message: "Settings exported successfully.", type: 'success'});
    }, [settings, setNotification]);

    const handleConfirmImportSettings = useCallback((importedSettings: Partial<Settings>) => {
        const newSettings = deepMerge(settings, importedSettings);
        updateSettings(newSettings);
        setTempSettings(newSettings);
        setNotification({id: Date.now(), message: "Settings successfully imported and saved.", type: "success"});
    }, [settings, updateSettings, setNotification]);

    const handleImportSettings = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedSettings: Partial<Settings> = JSON.parse(event.target?.result as string);
                if (!isObject(importedSettings) || (!('theme' in importedSettings) && !('ai' in importedSettings))) {
                    throw new Error("Invalid settings file format.");
                }
                if (importedSettings.ai && 
                    importedSettings.ai.model !== 'gemini-2.5-flash' && 
                    importedSettings.ai.model !== 'gemini-3-pro-preview') {
                    importedSettings.ai.model = 'gemini-2.5-flash';
                }
                handleConfirmImportSettings(importedSettings);
            } catch (error) {
                setNotification({id: Date.now(), message: `Import failed: ${error instanceof Error ? error.message : "Could not read file."}`, type: 'error'});
            } finally {
                if (settingsFileInputRef.current) settingsFileInputRef.current.value = "";
            }
        };
        reader.readAsText(file);
    }, [handleConfirmImportSettings, setNotification]);

    const handlePrune = useCallback(async () => {
        setIsProcessing(true);
        try {
            await onPruneByRelevance(pruneScore);
        } finally {
            if (isMounted.current) {
                setIsProcessing(false);
                setModalState(null);
            }
        }
    }, [onPruneByRelevance, pruneScore]);
    
    const handleMergeDuplicates = useCallback(async () => {
        setIsProcessing(true);
        try {
            await onMergeDuplicates();
        } finally {
            if (isMounted.current) {
                setIsProcessing(false);
                setModalState(null);
            }
        }
    }, [onMergeDuplicates]);
    
    const handleResetAllSettings = useCallback(() => {
        resetSettings();
        setNotification({id: Date.now(), message: "All settings have been reset to their defaults.", type: 'success'});
        setModalState(null);
    }, [resetSettings, setNotification]);
    
    const handleDeletePreset = useCallback(async (preset: Preset) => {
        await removePreset(preset.id);
        setModalState(null);
        setNotification({id: Date.now(), message: `Preset "${preset.name}" deleted.`, type: 'success'});
    }, [removePreset, setNotification]);

    const handleInstallPwa = useCallback(async () => {
        if (!installPromptEvent) return;
        installPromptEvent.prompt();
        const { outcome } = await installPromptEvent.userChoice;
        if (outcome === 'accepted') {
            console.log('User accepted the PWA installation');
        } else {
            console.log('User dismissed the PWA installation');
        }
        setInstallPromptEvent(null);
    }, [installPromptEvent, setInstallPromptEvent]);

    const handleSelectAllCsvColumns = useCallback(() => {
        setTempSettings(s => ({...s, export: {...s.export, csv: {...s.export.csv, columns: [...CSV_EXPORT_COLUMNS]}}}));
    }, []);

    const handleDeselectAllCsvColumns = useCallback(() => {
        setTempSettings(s => ({...s, export: {...s.export, csv: {...s.export.csv, columns: []}}}));
    }, []);

    return {
        settings,
        tempSettings,
        setTempSettings,
        activeTab,
        setActiveTab,
        modalState,
        setModalState,
        pruneScore,
        setPruneScore,
        errors,
        storageUsage,
        isProcessing,
        fileInputRef,
        settingsFileInputRef,
        tabsRef,
        isDirty,
        hasErrors,
        isPwaInstalled,
        installPromptEvent,
        handleSave,
        handleCancel,
        handleExportHistory,
        handleExportKnowledgeBase,
        handleImport,
        handleExportSettings,
        handleImportSettings,
        handlePrune,
        handleMergeDuplicates,
        handleResetAllSettings,
        handleDeletePreset,
        handleInstallPwa,
        handleSelectAllCsvColumns,
        handleDeselectAllCsvColumns,
        onClearKnowledgeBase,
        onNavigateToHelpTab,
        addKnowledgeBaseEntries,
        articlesToPruneCount,
        knowledgeBase,
        uniqueArticles,
        presets,
        t
    };
};
