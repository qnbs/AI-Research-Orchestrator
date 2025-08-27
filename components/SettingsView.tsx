

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { KnowledgeBaseEntry, Settings } from '../types';
import { TrashIcon } from './icons/TrashIcon';
import { UploadIcon } from './icons/UploadIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { SunIcon } from './icons/SunIcon';
import { MoonIcon } from './icons/MoonIcon';
import { InfoIcon } from './icons/InfoIcon';
import { Tooltip } from './Tooltip';
import { DocumentIcon } from './icons/DocumentIcon';
import { ClipboardDocumentListIcon } from './icons/ClipboardDocumentListIcon';
import { HistoryIcon } from './icons/HistoryIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { BellIcon } from './icons/BellIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';


type SettingsTab = 'general' | 'ai' | 'data' | 'about';

interface SettingsViewProps {
    knowledgeBase: KnowledgeBaseEntry[];
    setKnowledgeBase: React.Dispatch<React.SetStateAction<KnowledgeBaseEntry[]>>;
    onClearKnowledgeBase: () => void;
    showNotification: (message: string, type?: 'success' | 'error') => void;
    knowledgeBaseArticleCount: number;
    onMergeDuplicates: () => void;
    setIsSettingsDirty: (isDirty: boolean) => void;
    resetToken: number;
}

const personaDescriptions: Record<Settings['ai']['aiPersona'], string> = {
    'Neutral Scientist': 'Adopts a neutral, objective, and strictly scientific tone.',
    'Concise Expert': 'Be brief and to the point. Focuses on delivering the most critical information without verbosity.',
    'Detailed Analyst': 'Provides in-depth analysis. Explores nuances, methodologies, and potential implications thoroughly.',
    'Creative Synthesizer': 'Identifies and highlights novel connections, cross-disciplinary links, and innovative perspectives.'
};

const SettingCard: React.FC<{ title: React.ReactNode; description: string; children: React.ReactNode; rightContent?: React.ReactNode; }> = ({ title, description, children, rightContent }) => (
    <div className="bg-surface border border-border rounded-lg p-6">
        <div className="md:flex md:items-start md:justify-between">
            <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-text-primary">{title}</h3>
                <p className="mt-1 text-sm text-text-secondary">{description}</p>
                <div className="mt-4">
                    {children}
                </div>
            </div>
            {rightContent && <div className="mt-4 md:mt-0 md:ml-6 flex-shrink-0">{rightContent}</div>}
        </div>
    </div>
);

interface ModalProps {
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ onClose, title, children }) => (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm animate-fadeIn" style={{ animationDuration: '150ms' }}>
        <div className="bg-surface rounded-lg border border-border shadow-2xl p-6 w-full max-w-lg m-4 flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-brand-accent">{title}</h3>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-background">&times;</button>
            </div>
            <div className="overflow-y-auto pr-2">{children}</div>
        </div>
    </div>
);


interface ConfirmationModalProps {
    onConfirm: () => void;
    onCancel: () => void;
    title: string;
    message: React.ReactNode;
    confirmText: string;
    confirmButtonClass?: string;
    titleClass?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ onConfirm, onCancel, title, message, confirmText, confirmButtonClass = 'bg-red-600 hover:bg-red-700', titleClass = 'text-red-400' }) => (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm animate-fadeIn" style={{ animationDuration: '150ms' }}>
        <div className="bg-surface rounded-lg border border-border shadow-2xl p-6 w-full max-w-md m-4">
            <h3 className={`text-lg font-bold ${titleClass}`}>{title}</h3>
            <div className="mt-2 text-text-secondary">{message}</div>
            <div className="mt-6 flex justify-end space-x-3">
                <button onClick={onCancel} className="px-4 py-2 border border-border text-sm font-medium rounded-md shadow-sm text-text-primary bg-background hover:bg-surface-hover">
                    Cancel
                </button>
                <button onClick={onConfirm} className={`px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${confirmButtonClass}`}>
                    {confirmText}
                </button>
            </div>
        </div>
    </div>
);

export const SettingsView: React.FC<SettingsViewProps> = ({ knowledgeBase, setKnowledgeBase, onClearKnowledgeBase, showNotification, knowledgeBaseArticleCount, onMergeDuplicates, setIsSettingsDirty, resetToken }) => {
    const { settings, updateSettings, resetSettings } = useSettings();
    const [tempSettings, setTempSettings] = useState(settings);
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');
    const [modalState, setModalState] = useState<{ type: 'clear' | 'reset' | 'import' | 'prune' | 'changelog' | 'merge' | 'confirmModelChange', data?: any } | null>(null);
    const [pruneScore, setPruneScore] = useState(20);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const settingsFileInputRef = useRef<HTMLInputElement>(null);

    const isObject = (item: any): item is object => {
        return (item && typeof item === 'object' && !Array.isArray(item));
    };

    const deepMerge = <T extends object>(target: T, source: Partial<T>): T => {
        const output: T = { ...target };
        Object.keys(source).forEach(key => {
            const targetValue = (target as any)[key];
            const sourceValue = (source as any)[key];

            if (isObject(targetValue) && isObject(sourceValue)) {
                (output as any)[key] = deepMerge(targetValue, sourceValue);
            } else if (sourceValue !== undefined) {
                (output as any)[key] = sourceValue;
            }
        });
        return output;
    };
    
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


    const handleSave = () => {
        updateSettings(tempSettings);
        showNotification("Settings saved successfully!");
    };
    
    const handleCancel = () => {
        setTempSettings(settings);
    };

    const handleExport = () => {
        if (knowledgeBase.length === 0) {
            showNotification("Knowledge base is empty. Nothing to export.", 'error');
            return;
        }
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(knowledgeBase))}`;
        const link = document.createElement("a");
        link.href = jsonString;
        const date = new Date().toISOString().split('T')[0];
        link.download = `ai_research_orchestrator_backup_${date}.json`;
        link.click();
        showNotification("Knowledge base exported.");
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedData = JSON.parse(event.target?.result as string);
                if (Array.isArray(importedData) && importedData.every(item => 'input' in item && 'report' in item)) {
                    setModalState({ type: 'import', data: importedData });
                } else {
                    throw new Error("Invalid file format. The file must be an array of Knowledge Base entries.");
                }
            } catch (error) {
                showNotification(`Import failed: ${error instanceof Error ? error.message : "Could not read file."}`, 'error');
            } finally {
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        };
        reader.readAsText(file);
    };

    const handleExportSettings = () => {
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(settings))}`;
        const link = document.createElement("a");
        link.href = jsonString;
        const date = new Date().toISOString().split('T')[0];
        link.download = `ai_research_orchestrator_settings_${date}.json`;
        link.click();
        showNotification("Settings exported successfully.");
    };

    const handleImportSettings = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedSettings: Partial<Settings> = JSON.parse(event.target?.result as string);
                if (!isObject(importedSettings) || (!('theme' in importedSettings) && !('ai' in importedSettings))) {
                    throw new Error("Invalid settings file format.");
                }

                const currentModel = settings.ai.model;
                const importedModel = importedSettings.ai?.model;

                if (importedModel && importedModel !== currentModel) {
                    setModalState({ type: 'confirmModelChange', data: importedSettings });
                } else {
                    handleConfirmImportSettings(importedSettings);
                }
            } catch (error) {
                showNotification(`Import failed: ${error instanceof Error ? error.message : "Could not read file."}`, 'error');
            } finally {
                if (settingsFileInputRef.current) settingsFileInputRef.current.value = "";
            }
        };
        reader.readAsText(file);
    };
    
    const handleConfirmImportSettings = (importedSettings: Partial<Settings>) => {
        const newSettings = deepMerge(settings, importedSettings);
        updateSettings(newSettings);
        showNotification("Settings imported successfully!");
        setModalState(null);
    };

    const handleConfirmClear = () => {
        onClearKnowledgeBase();
        setModalState(null);
    };

    const handleConfirmReset = () => {
        resetSettings();
        showNotification("Settings have been reset to default.");
        setModalState(null);
    };

    const handleConfirmImport = () => {
        if (modalState?.type === 'import' && modalState.data) {
            setKnowledgeBase(modalState.data);
            showNotification(`Successfully imported ${modalState.data.length} entries.`);
        }
        setModalState(null);
    };

     const handleConfirmMerge = () => {
        onMergeDuplicates();
        setModalState(null);
    };

    const handleConfirmPrune = () => {
        const pmidsToKeep = new Set<string>();
        let originalPmidCount = 0;
        const originalPmids = new Set<string>();

        knowledgeBase.forEach(entry => {
            entry.report.rankedArticles.forEach(article => {
                originalPmids.add(article.pmid);
                if (article.relevanceScore >= pruneScore) {
                    pmidsToKeep.add(article.pmid);
                }
            });
        });
        originalPmidCount = originalPmids.size;

        const newKb = knowledgeBase.map(entry => ({
            ...entry,
            report: {
                ...entry.report,
                rankedArticles: entry.report.rankedArticles.filter(article => pmidsToKeep.has(article.pmid)),
            }
        })).filter(entry => entry.report.rankedArticles.length > 0);

        setKnowledgeBase(newKb);
        const articlesPruned = originalPmidCount - pmidsToKeep.size;
        showNotification(`Pruned ${articlesPruned} unique article(s) with scores below ${pruneScore}.`);
        setModalState(null);
    };
    
    const TabButton: React.FC<{ tabId: SettingsTab; children: React.ReactNode }> = ({ tabId, children }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`w-full text-left px-4 py-2.5 rounded-md text-sm font-medium transition-colors flex items-center ${activeTab === tabId ? 'bg-brand-accent text-brand-text-on-accent' : 'text-text-primary bg-background hover:bg-surface-hover'}`}
        >
            {children}
        </button>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'general':
                return (
                    <div className="space-y-6">
                        <SettingCard title="Appearance" description="Customize the look and feel of the application.">
                            <div className="flex items-center space-x-2 p-1 bg-background border border-border rounded-lg">
                                <button onClick={() => setTempSettings(s => ({...s, theme: 'light'}))} className={`flex-1 flex justify-center items-center p-2 rounded-md text-sm transition-colors ${tempSettings.theme === 'light' ? 'bg-surface text-text-primary' : 'text-text-secondary hover:bg-surface-hover'}`}><SunIcon className="w-5 h-5 mr-2" /> Light</button>
                                <button onClick={() => setTempSettings(s => ({...s, theme: 'dark'}))} className={`flex-1 flex justify-center items-center p-2 rounded-md text-sm transition-colors ${tempSettings.theme === 'dark' ? 'bg-surface text-text-primary' : 'text-text-secondary hover:bg-surface-hover'}`}><MoonIcon className="w-5 h-5 mr-2" /> Dark</button>
                            </div>
                        </SettingCard>
                        <SettingCard title="Accessibility & Performance" description="Adjust settings related to application behavior and accessibility.">
                            <div className="flex items-center justify-between">
                                <label htmlFor="enableAnimations" className="text-sm font-medium text-text-primary flex items-center">Enable Animations
                                    <Tooltip content="Enable or disable UI animations. Disabling may improve performance and is better for users with motion sensitivity."><InfoIcon className="h-4 w-4 text-text-secondary ml-2 cursor-help" /></Tooltip>
                                </label>
                                <div className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 ease-in-out cursor-pointer ${tempSettings.performance.enableAnimations ? 'bg-brand-accent' : 'bg-gray-400 dark:bg-gray-600'}`} onClick={() => setTempSettings(s => ({...s, performance: {...s.performance, enableAnimations: !s.performance.enableAnimations }}))}>
                                    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out ${tempSettings.performance.enableAnimations ? 'translate-x-6' : 'translate-x-1'}`}/>
                                </div>
                            </div>
                        </SettingCard>
                        <SettingCard title="Notifications" description="Configure how notifications are displayed.">
                             <div className="space-y-4">
                               <div className="flex items-center justify-between">
                                    <label htmlFor="notificationPosition" className="text-sm font-medium text-text-primary">Position</label>
                                    <select id="notificationPosition" value={tempSettings.notifications.position} onChange={(e) => setTempSettings(s => ({...s, notifications: {...s.notifications, position: e.target.value as Settings['notifications']['position'] }}))} className="block w-40 bg-background border border-border rounded-md py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent sm:text-sm">
                                        <option value="bottom-right">Bottom Right</option>
                                        <option value="bottom-left">Bottom Left</option>
                                        <option value="top-right">Top Right</option>
                                        <option value="top-left">Top Left</option>
                                    </select>
                                </div>
                               <div className="flex flex-col">
                                     <label htmlFor="notificationDuration" className="text-sm font-medium text-text-primary mb-2">Duration</label>
                                     <div className="flex items-center">
                                        <input type="range" id="notificationDuration" min="2000" max="10000" step="500" value={tempSettings.notifications.duration} onChange={(e) => setTempSettings(s => ({...s, notifications: {...s.notifications, duration: parseInt(e.target.value) }}))} className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer" />
                                        <span className="ml-4 font-mono text-text-primary bg-background px-2 py-1 rounded w-20 text-center">{(tempSettings.notifications.duration / 1000).toFixed(1)}s</span>
                                    </div>
                                </div>
                                <div className="pt-2">
                                     <button onClick={() => showNotification("This is a test notification.", "success")} className="w-full inline-flex items-center justify-center px-4 py-2 border border-border text-sm font-medium rounded-md shadow-sm text-text-primary bg-background hover:bg-surface-hover">
                                         <BellIcon className="h-4 w-4 mr-2" /> Test Notification
                                     </button>
                                </div>
                            </div>
                        </SettingCard>
                    </div>
                );
            case 'ai':
                return (
                    <div className="space-y-6">
                        <SettingCard title="AI Configuration" description="Control the behavior and personality of the AI research agents.">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-text-primary flex items-center">
                                        AI Persona
                                        <Tooltip content="Defines the tone and focus of the AI's analysis and synthesis."><InfoIcon className="h-4 w-4 text-text-secondary ml-2 cursor-help" /></Tooltip>
                                    </label>
                                    <fieldset className="mt-2">
                                        <legend className="sr-only">AI Persona</legend>
                                        <div className="space-y-3">
                                            {(Object.keys(personaDescriptions) as Array<keyof typeof personaDescriptions>).map((persona) => (
                                                <div 
                                                    key={persona} 
                                                    className={`p-3 rounded-lg border cursor-pointer transition-all ${tempSettings.ai.aiPersona === persona ? 'bg-brand-accent/10 border-brand-accent/30' : 'bg-background border-border hover:border-brand-accent/50'}`} 
                                                    onClick={() => setTempSettings(s => ({...s, ai: {...s.ai, aiPersona: persona }}))}
                                                >
                                                    <div className="flex items-center">
                                                        <input
                                                            id={persona}
                                                            name="ai-persona"
                                                            type="radio"
                                                            checked={tempSettings.ai.aiPersona === persona}
                                                            onChange={() => setTempSettings(s => ({...s, ai: {...s.ai, aiPersona: persona }}))}
                                                            className="h-4 w-4 border-border bg-background text-brand-accent focus:ring-brand-accent"
                                                        />
                                                        <label htmlFor={persona} className="ml-3 block text-sm font-medium text-text-primary cursor-pointer">
                                                            {persona}
                                                        </label>
                                                    </div>
                                                    <p className="ml-7 mt-1 text-xs text-text-secondary">{personaDescriptions[persona]}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </fieldset>
                                </div>
                                <div className="flex items-center justify-between">
                                    <label htmlFor="aiLanguage" className="text-sm font-medium text-text-primary">Response Language</label>
                                    <select id="aiLanguage" value={tempSettings.ai.aiLanguage} onChange={(e) => setTempSettings(s => ({...s, ai: {...s.ai, aiLanguage: e.target.value as Settings['ai']['aiLanguage'] }}))} className="block w-48 bg-background border border-border rounded-md py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent sm:text-sm">
                                        <option>English</option>
                                        <option>German</option>
                                        <option>French</option>
                                        <option>Spanish</option>
                                    </select>
                                </div>
                                <div className="flex flex-col">
                                    <label htmlFor="temperature" className="text-sm font-medium text-text-primary mb-2 flex items-center">
                                        AI Creativity (Temperature)
                                        <Tooltip content="Controls randomness. Lower values are more focused and deterministic. Higher values are more creative."><InfoIcon className="h-4 w-4 text-text-secondary ml-2 cursor-help" /></Tooltip>
                                    </label>
                                    <div className="flex items-center">
                                        <input type="range" id="temperature" min="0" max="1" step="0.1" value={tempSettings.ai.temperature} onChange={(e) => setTempSettings(s => ({...s, ai: {...s.ai, temperature: parseFloat(e.target.value) }}))} className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer" />
                                        <span className="ml-4 font-mono text-text-primary bg-background px-2 py-1 rounded w-16 text-center">{tempSettings.ai.temperature.toFixed(1)}</span>
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="customPreamble" className="text-sm font-medium text-text-primary mb-1 flex items-center">
                                        Custom Preamble / Instructions
                                        <Tooltip content="Add custom instructions to the AI's system prompt. This can be used to further guide its behavior."><InfoIcon className="h-4 w-4 text-text-secondary ml-2 cursor-help" /></Tooltip>
                                    </label>
                                    <textarea id="customPreamble" rows={3} value={tempSettings.ai.customPreamble} onChange={(e) => setTempSettings(s => ({...s, ai: {...s.ai, customPreamble: e.target.value }}))} className="block w-full bg-background border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent sm:text-sm" placeholder="e.g., 'Focus primarily on pediatric studies.'"></textarea>
                                </div>
                            </div>
                        </SettingCard>
                        <SettingCard title="Default Research Parameters" description="Set the default values for the main research form to speed up your workflow.">
                            <div className="space-y-4">
                               <div className="flex items-center justify-between">
                                    <label htmlFor="maxArticlesToScan" className="text-sm font-medium text-text-primary">Default Max Articles to Scan</label>
                                    <input type="number" id="maxArticlesToScan" min="10" max="200" step="10" value={tempSettings.defaults.maxArticlesToScan} onChange={(e) => setTempSettings(s => ({...s, defaults: {...s.defaults, maxArticlesToScan: parseInt(e.target.value) }}))} className="block w-24 bg-background border border-border rounded-md py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent sm:text-sm" />
                                </div>
                               <div className="flex items-center justify-between">
                                    <label htmlFor="topNToSynthesize" className="text-sm font-medium text-text-primary">Default Top Articles to Synthesize</label>
                                    <input type="number" id="topNToSynthesize" min="1" max="20" value={tempSettings.defaults.topNToSynthesize} onChange={(e) => setTempSettings(s => ({...s, defaults: {...s.defaults, topNToSynthesize: parseInt(e.target.value) }}))} className="block w-24 bg-background border border-border rounded-md py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent sm:text-sm" />
                                </div>
                                <div className="flex items-center justify-between">
                                    <label htmlFor="autoSaveReports" className="text-sm font-medium text-text-primary flex items-center">
                                        Automatically Save Reports
                                        <Tooltip content="If enabled, all successfully generated reports will be automatically saved to your Knowledge Base."><InfoIcon className="h-4 w-4 text-text-secondary ml-2 cursor-help" /></Tooltip>
                                    </label>
                                    <div className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 ease-in-out cursor-pointer ${tempSettings.defaults.autoSaveReports ? 'bg-brand-accent' : 'bg-gray-400 dark:bg-gray-600'}`} onClick={() => setTempSettings(s => ({...s, defaults: {...s.defaults, autoSaveReports: !s.defaults.autoSaveReports }}))}>
                                        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out ${tempSettings.defaults.autoSaveReports ? 'translate-x-6' : 'translate-x-1'}`}/>
                                    </div>
                                </div>
                            </div>
                        </SettingCard>
                    </div>
                );
            case 'data':
                return (
                    <div className="space-y-6">
                        <SettingCard title="Knowledge Base Management" description="Export, import, or clear all data stored in your Knowledge Base. These actions are irreversible.">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <button onClick={handleExport} className="inline-flex items-center justify-center w-full px-4 py-2 border border-border text-sm font-medium rounded-md shadow-sm text-text-primary bg-background hover:bg-surface-hover">
                                    <DownloadIcon className="h-5 w-5 mr-2" /> Export Knowledge Base
                                </button>
                                <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center justify-center w-full px-4 py-2 border border-border text-sm font-medium rounded-md shadow-sm text-text-primary bg-background hover:bg-surface-hover">
                                    <UploadIcon className="h-5 w-5 mr-2" /> Import Knowledge Base
                                </button>
                                <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
                            </div>
                            <div className="mt-4 border-t border-border pt-4">
                                <button onClick={() => setModalState({type: 'clear'})} disabled={knowledgeBase.length === 0} className="w-full flex items-center justify-center text-sm px-4 py-2 rounded-md text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                    <TrashIcon className="h-4 w-4 mr-2" />Clear All Knowledge Base Data...
                                </button>
                            </div>
                        </SettingCard>
                         <SettingCard title="Settings Management" description="Export your current settings configuration or import a saved configuration file.">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <button onClick={handleExportSettings} className="inline-flex items-center justify-center w-full px-4 py-2 border border-border text-sm font-medium rounded-md shadow-sm text-text-primary bg-background hover:bg-surface-hover">
                                    <DownloadIcon className="h-5 w-5 mr-2" /> Export Settings
                                </button>
                                <button onClick={() => settingsFileInputRef.current?.click()} className="inline-flex items-center justify-center w-full px-4 py-2 border border-border text-sm font-medium rounded-md shadow-sm text-text-primary bg-background hover:bg-surface-hover">
                                    <UploadIcon className="h-5 w-5 mr-2" /> Import Settings
                                </button>
                                <input type="file" ref={settingsFileInputRef} onChange={handleImportSettings} accept=".json" className="hidden" />
                            </div>
                        </SettingCard>
                        <SettingCard title="Data Cleaning Tools" description="Optimize your knowledge base by merging duplicates or removing low-relevance articles.">
                             <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-background border border-border rounded-lg">
                                    <div>
                                        <h4 className="font-semibold text-text-primary">Merge Duplicates</h4>
                                        <p className="text-xs text-text-secondary mt-1">Scan for articles with the same PMID and keep only the version with the highest relevance score.</p>
                                    </div>
                                    <button onClick={() => setModalState({ type: 'merge' })} className="ml-4 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-brand-text-on-accent bg-brand-accent hover:bg-opacity-90">Merge</button>
                                </div>
                                <div className="p-3 bg-background border border-border rounded-lg">
                                    <h4 className="font-semibold text-text-primary">Prune by Relevance</h4>
                                    <p className="text-xs text-text-secondary mt-1 mb-3">Permanently delete all unique articles with a relevance score below the selected threshold.</p>
                                    <div className="flex items-center">
                                        <input type="range" min="0" max="100" value={pruneScore} onChange={(e) => setPruneScore(parseInt(e.target.value))} className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer" />
                                        <span className="ml-4 font-mono text-text-primary bg-surface px-2 py-1 rounded w-16 text-center">{pruneScore}</span>
                                    </div>
                                    <button onClick={() => setModalState({ type: 'prune' })} className="mt-3 w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700">Prune Articles...</button>
                                </div>
                             </div>
                        </SettingCard>
                    </div>
                );
            case 'about':
                return (
                     <div className="space-y-6">
                        <SettingCard title="About AI Research Orchestrator" description={`Version 1.0.0 - Your intelligent partner for biomedical literature reviews.`}>
                            <p className="text-sm text-text-secondary">This application leverages the power of Google's Gemini large language models to automate and accelerate the process of scientific literature analysis. By providing a research topic, the app orchestrates a series of AI agents to query PubMed, screen articles, synthesize findings, and present them in a structured, actionable report.</p>
                            <div className="mt-4">
                                <button onClick={() => setModalState({type: 'changelog'})} className="text-sm text-brand-accent hover:underline">View Changelog</button>
                            </div>
                        </SettingCard>
                        <SettingCard title="Disclaimer" description="Important information about using this tool.">
                            <p className="text-sm text-text-secondary">The information provided by this application is generated by an AI and is intended for informational and research purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult with a qualified healthcare provider for any health-related questions. The developers are not responsible for any errors or omissions in the AI-generated content or for any actions taken based on its output.</p>
                        </SettingCard>
                     </div>
                );
            default:
                return null;
        }
    };

    return (
    <>
        <div className="animate-fadeIn">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-brand-accent">Settings</h1>
                <p className="mt-2 text-lg text-text-secondary">Configure your research environment and manage your data.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <aside className="md:col-span-1">
                    <div className="sticky top-24 space-y-2">
                        <TabButton tabId="general"><SunIcon className="w-5 h-5 mr-3" /> General</TabButton>
                        <TabButton tabId="ai"><SparklesIcon className="w-5 h-5 mr-3" /> AI & Defaults</TabButton>
                        <TabButton tabId="data"><DatabaseIcon className="w-5 h-5 mr-3" /> Data Management</TabButton>
                        <TabButton tabId="about"><InfoIcon className="w-5 h-5 mr-3" /> About</TabButton>
                    </div>
                </aside>

                <main className="md:col-span-3">
                    <div className="relative pb-24">
                        {renderContent()}
                        
                        {isDirty && (
                             <div className="fixed bottom-0 right-0 w-full lg:w-[calc(75%-2rem)]">
                                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                                     <div className="bg-surface/80 backdrop-blur-sm border-t border-border p-4 flex justify-end space-x-3">
                                        <button onClick={handleCancel} className="px-4 py-2 border border-border text-sm font-medium rounded-md shadow-sm text-text-primary bg-background hover:bg-surface-hover">
                                            Cancel
                                        </button>
                                        <button onClick={handleSave} className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-brand-text-on-accent bg-brand-accent hover:bg-opacity-90">
                                            Save Changes
                                        </button>
                                    </div>
                                </div>
                             </div>
                        )}
                    </div>
                </main>
            </div>
        </div>

        {modalState?.type === 'clear' && (
            <ConfirmationModal
                onConfirm={handleConfirmClear}
                onCancel={() => setModalState(null)}
                title="Clear Knowledge Base"
                message={<p>Are you sure you want to permanently delete all <strong>{knowledgeBase.length} report(s)</strong> and <strong>{knowledgeBaseArticleCount} unique article(s)</strong>? This action cannot be undone.</p>}
                confirmText="Yes, Clear Everything"
            />
        )}
        
        {modalState?.type === 'reset' && (
            <ConfirmationModal
                onConfirm={handleConfirmReset}
                onCancel={() => setModalState(null)}
                title="Reset All Settings"
                message="Are you sure you want to reset all settings to their default values? This will not affect your Knowledge Base data."
                confirmText="Yes, Reset Settings"
            />
        )}
        
        {modalState?.type === 'import' && modalState.data && (
            <ConfirmationModal
                onConfirm={handleConfirmImport}
                onCancel={() => setModalState(null)}
                title="Confirm Data Import"
                message={<p>This will overwrite your current knowledge base with <strong>{modalState.data.length}</strong> new entries. This action cannot be undone. Are you sure you wish to proceed?</p>}
                confirmText="Overwrite and Import"
                confirmButtonClass="bg-brand-accent hover:bg-opacity-90"
                titleClass="text-brand-accent"
            />
        )}
        
        {modalState?.type === 'merge' && (
            <ConfirmationModal
                onConfirm={handleConfirmMerge}
                onCancel={() => setModalState(null)}
                title="Merge Duplicate Articles"
                message="This will scan your Knowledge Base and remove duplicate article entries, keeping only the version with the highest relevance score. Are you sure you want to proceed?"
                confirmText="Yes, Merge Duplicates"
                confirmButtonClass="bg-brand-accent hover:bg-opacity-90"
                titleClass="text-brand-accent"
            />
        )}

        {modalState?.type === 'prune' && (
            <ConfirmationModal
                onConfirm={handleConfirmPrune}
                onCancel={() => setModalState(null)}
                title={`Prune Articles Below Score ${pruneScore}`}
                message={<p>This will permanently delete all articles from your Knowledge Base with a relevance score less than <strong>{pruneScore}</strong>. This action cannot be undone.</p>}
                confirmText="Yes, Prune Articles"
            />
        )}
        
        {modalState?.type === 'confirmModelChange' && modalState.data && (
            <ConfirmationModal
                onConfirm={() => handleConfirmImportSettings(modalState.data)}
                onCancel={() => setModalState(null)}
                title="Confirm AI Model Change"
                message={
                    <div>
                        <p>The settings file you are importing specifies a different AI model than your current one:</p>
                        <ul className="list-disc list-inside my-2 text-sm text-left">
                            <li>Current: <code className="bg-background px-1 py-0.5 rounded">{settings.ai.model}</code></li>
                            <li>Imported: <code className="bg-background px-1 py-0.5 rounded">{modalState.data.ai?.model}</code></li>
                        </ul>
                        <p>Continuing will change the model used for generating reports. Are you sure?</p>
                    </div>
                }
                confirmText="Yes, Change Model and Import"
                confirmButtonClass="bg-yellow-600 hover:bg-yellow-700"
                titleClass="text-yellow-400"
            />
        )}

        {modalState?.type === 'changelog' && (
            <Modal onClose={() => setModalState(null)} title="Changelog">
                <div className="prose prose-sm prose-invert max-w-none text-text-secondary/90 leading-relaxed">
                    <h4>Version 1.0.0 (Initial Release)</h4>
                    <ul>
                        <li>Core functionality: AI-powered literature review generation.</li>
                        <li>Knowledge Base for aggregating and searching articles.</li>
                        <li>PDF, CSV, and citation export capabilities.</li>
                        <li>Customizable AI personas, themes, and default settings.</li>
                    </ul>
                </div>
            </Modal>
        )}
    </>
    );
};