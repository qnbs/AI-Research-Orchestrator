import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { usePresets } from '../contexts/PresetContext';
import { Settings, AggregatedArticle, CSV_EXPORT_COLUMNS, ARTICLE_TYPES, Preset } from '../types';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { TrashIcon } from './icons/TrashIcon';
import { UploadIcon } from './icons/UploadIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { SunIcon } from './icons/SunIcon';
import { MoonIcon } from './icons/MoonIcon';
import { InfoIcon } from './icons/InfoIcon';
import { Tooltip } from './Tooltip';
import { SparklesIcon } from './icons/SparklesIcon';
import { BellIcon } from './icons/BellIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { ConfirmationModal } from './ConfirmationModal';
import { GearIcon } from './icons/GearIcon';
import { ExportIcon } from './icons/ExportIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { exportHistoryToJson, exportKnowledgeBaseToJson } from '../services/exportService';
import { SettingCard } from './SettingCard';
import { Toggle } from './Toggle';
import { useKnowledgeBase } from '../contexts/KnowledgeBaseContext';
import { useUI } from '../contexts/UIContext';


type SettingsTab = 'general' | 'ai' | 'knowledgeBase' | 'export' | 'data';

interface SettingsViewProps {
    onClearKnowledgeBase: () => void;
    resetToken: number;
    onNavigateToHelpTab: (tab: 'about' | 'faq') => void;
}

const personaDescriptions: Record<Settings['ai']['aiPersona'], string> = {
    'Neutral Scientist': 'Adopts a neutral, objective, and strictly scientific tone.',
    'Concise Expert': 'Be brief and to the point. Focuses on delivering the most critical information without verbosity.',
    'Detailed Analyst': 'Provides in-depth analysis. Explores nuances, methodologies, and potential implications thoroughly.',
    'Creative Synthesizer': 'Identifies and highlights novel connections, cross-disciplinary links, and innovative perspectives found in the literature.'
};

interface ModalProps {
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ onClose, title, children }) => {
    const modalRef = useFocusTrap<HTMLDivElement>(true);
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm animate-fadeIn" style={{ animationDuration: '150ms' }}>
            <div ref={modalRef} className="bg-surface rounded-lg border border-border shadow-2xl p-6 w-full max-w-lg m-4 flex flex-col max-h-[80vh]">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold brand-gradient-text">{title}</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-background" aria-label="Close modal">&times;</button>
                </div>
                <div className="overflow-y-auto pr-2">{children}</div>
            </div>
        </div>
    );
}

// --- TAB SUB-COMPONENTS ---

const GeneralSettingsTab: React.FC<{
    tempSettings: Settings;
    setTempSettings: React.Dispatch<React.SetStateAction<Settings>>;
}> = ({ tempSettings, setTempSettings }) => (
    <div className="space-y-8">
        <SettingCard icon={<SunIcon className="w-6 h-6 text-accent-amber"/>} title="Appearance" description="Customize the look and feel of the application.">
            <div className="flex items-center space-x-2">
                <button
                    onClick={() => setTempSettings(s => ({...s, theme: 'light'}))}
                    className={`p-2 rounded-lg border-2 ${tempSettings.theme === 'light' ? 'border-brand-accent' : 'border-transparent'}`}
                    aria-label="Switch to Light Theme"
                >
                    <div className="w-20 h-12 bg-gray-100 rounded-md flex items-center justify-center"><SunIcon className="h-6 w-6 text-yellow-500" /></div>
                    <span className="text-sm mt-1 block text-text-primary">Light</span>
                </button>
                    <button
                    onClick={() => setTempSettings(s => ({...s, theme: 'dark'}))}
                    className={`p-2 rounded-lg border-2 ${tempSettings.theme === 'dark' ? 'border-brand-accent' : 'border-transparent'}`}
                    aria-label="Switch to Dark Theme"
                >
                    <div className="w-20 h-12 bg-gray-800 rounded-md flex items-center justify-center"><MoonIcon className="h-6 w-6 text-blue-300" /></div>
                    <span className="text-sm mt-1 block text-text-primary">Dark</span>
                </button>
            </div>
            <div className="pt-4 mt-4 border-t border-border">
                <div className="flex items-center gap-2 mb-2">
                    <label className="block text-sm font-medium text-text-primary">UI Density</label>
                    <Tooltip content="Adjust the spacing and size of UI elements. 'Compact' is useful for smaller screens or fitting more information.">
                        <InfoIcon className="h-4 w-4 text-text-secondary cursor-help" />
                    </Tooltip>
                </div>
                <div className="flex w-full max-w-xs bg-background p-1 rounded-lg border border-border">
                    <button
                        onClick={() => setTempSettings(s => ({...s, appearance: {...s.appearance, density: 'comfortable'}}))}
                        className={`w-1/2 p-1.5 rounded-md text-sm font-medium transition-colors ${tempSettings.appearance.density === 'comfortable' ? 'bg-brand-accent text-brand-text-on-accent' : 'text-text-secondary hover:bg-surface'}`}
                    >
                        Comfortable
                    </button>
                    <button
                        onClick={() => setTempSettings(s => ({...s, appearance: {...s.appearance, density: 'compact'}}))}
                        className={`w-1/2 p-1.5 rounded-md text-sm font-medium transition-colors ${tempSettings.appearance.density === 'compact' ? 'bg-brand-accent text-brand-text-on-accent' : 'text-text-secondary hover:bg-surface'}`}
                    >
                        Compact
                    </button>
                </div>
            </div>
            <div className="pt-4 mt-4 border-t border-border">
                <label htmlFor="font-family" className="block text-sm font-medium text-text-primary mb-2">Application Font</label>
                <select 
                    id="font-family" 
                    value={tempSettings.appearance.fontFamily} 
                    onChange={(e) => setTempSettings(s => ({...s, appearance: {...s.appearance, fontFamily: e.target.value as any}}))} 
                    className="block w-full max-w-xs bg-background border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                >
                    <option value="Inter">Inter (Default)</option>
                    <option value="Lato">Lato</option>
                    <option value="Roboto">Roboto</option>
                    <option value="Open Sans">Open Sans</option>
                </select>
            </div>
            <div className="pt-4 mt-4 border-t border-border">
                <Toggle 
                    checked={tempSettings.appearance.customColors.enabled} 
                    onChange={checked => setTempSettings(s => ({...s, appearance: {...s.appearance, customColors: {...s.appearance.customColors, enabled: checked}}}))}
                >
                    Enable Custom Colors
                </Toggle>
                {tempSettings.appearance.customColors.enabled && (
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fadeIn" style={{ animationDuration: '300ms' }}>
                        {(['primary', 'secondary', 'accent'] as const).map((colorType) => (
                            <div key={colorType}>
                                <label htmlFor={`color-${colorType}`} className="block text-sm font-medium text-text-primary capitalize">{colorType} Color</label>
                                <div className="mt-1 flex items-center gap-2 p-1.5 border border-border rounded-md bg-background">
                                    <input 
                                        type="color" 
                                        id={`color-${colorType}`} 
                                        value={tempSettings.appearance.customColors[colorType]}
                                        onChange={(e) => setTempSettings(s => ({...s, appearance: {...s.appearance, customColors: {...s.appearance.customColors, [colorType]: e.target.value}}}))}
                                        className="w-8 h-8 p-0 border-none rounded cursor-pointer bg-transparent"
                                        aria-label={`${colorType} color picker`}
                                    />
                                    <input
                                        type="text"
                                        value={tempSettings.appearance.customColors[colorType]}
                                        onChange={(e) => setTempSettings(s => ({...s, appearance: {...s.appearance, customColors: {...s.appearance.customColors, [colorType]: e.target.value}}}))}
                                        className="block w-full bg-transparent border-none focus:outline-none focus:ring-0 sm:text-sm font-mono"
                                        aria-label={`${colorType} color hex value`}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </SettingCard>
        <SettingCard icon={<BellIcon className="w-6 h-6 text-accent-cyan"/>} title="Notifications" description="Control how and where notifications appear.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="notif-pos" className="block text-sm font-medium text-text-primary mb-1">Position</label>
                    <select id="notif-pos" value={tempSettings.notifications.position} onChange={(e) => setTempSettings(s => ({...s, notifications: {...s.notifications, position: e.target.value as any}}))} className="block w-full bg-background border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent">
                        <option value="bottom-right">Bottom Right</option>
                        <option value="bottom-left">Bottom Left</option>
                        <option value="top-right">Top Right</option>
                        <option value="top-left">Top Left</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="notif-dur" className="block text-sm font-medium text-text-primary mb-1">Duration (ms)</label>
                    <input type="number" id="notif-dur" step="500" min="1000" value={tempSettings.notifications.duration} onChange={(e) => setTempSettings(s => ({...s, notifications: {...s.notifications, duration: parseInt(e.target.value, 10)}}))} className="block w-full bg-background border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent"/>
                </div>
            </div>
        </SettingCard>
        <SettingCard icon={<GearIcon className="w-6 h-6 text-text-secondary"/>} title="Performance" description="Manage performance-related settings. Disabling animations may improve responsiveness on older devices.">
                <Toggle checked={tempSettings.performance.enableAnimations} onChange={checked => setTempSettings(s => ({...s, performance: {...s.performance, enableAnimations: checked}}))}>
                    Enable UI Animations
                </Toggle>
        </SettingCard>
    </div>
);

const AISettingsTab: React.FC<{
    tempSettings: Settings;
    setTempSettings: React.Dispatch<React.SetStateAction<Settings>>;
    errors: { formDefaults?: string };
}> = ({ tempSettings, setTempSettings, errors }) => {
    
    const handleArticleTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value, checked } = e.target;
        setTempSettings(prev => {
          const currentTypes = prev.defaults.defaultArticleTypes;
          const newTypes = checked ? [...currentTypes, value] : currentTypes.filter(type => type !== value);
          return { ...prev, defaults: { ...prev.defaults, defaultArticleTypes: newTypes } };
        });
    };

    return (
        <div className="space-y-8">
            <SettingCard icon={<SparklesIcon className="w-6 h-6 text-accent-magenta"/>} title="AI Configuration" description="Fine-tune the AI's behavior, language, and core instructions.">
                <div className="space-y-6">
                    <div>
                        <label htmlFor="ai-model" className="font-medium text-text-primary">AI Model</label>
                        <select id="ai-model" value={tempSettings.ai.model} disabled className="mt-1 block w-full bg-background/50 border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent disabled:cursor-not-allowed">
                            <option value="gemini-2.5-flash">gemini-2.5-flash (Recommended)</option>
                        </select>
                        <p className="text-xs text-text-secondary mt-1">Only recommended models are available to ensure optimal performance and compliance.</p>
                    </div>

                    <div>
                        <label className="font-medium text-text-primary block">AI Persona</label>
                            <fieldset className="mt-2">
                            <legend className="sr-only">AI Persona</legend>
                            <div className="space-y-2">
                                {Object.entries(personaDescriptions).map(([key, description]) => (
                                    <label key={key} className="flex items-start p-3 rounded-md border has-[:checked]:border-brand-accent has-[:checked]:bg-brand-accent/10 transition-colors cursor-pointer dark:border-border dark:has-[:checked]:border-brand-accent">
                                        <input type="radio" name="ai-persona" value={key} checked={tempSettings.ai.aiPersona === key} onChange={(e) => setTempSettings(s => ({...s, ai: {...s.ai, aiPersona: e.target.value as any}}))} className="h-4 w-4 mt-0.5 text-brand-accent focus:ring-brand-accent border-border bg-background" />
                                        <span className="ml-3 text-sm">
                                            <span className="font-medium text-text-primary block">{key}</span>
                                            <span className="text-text-secondary">{description}</span>
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </fieldset>
                    </div>
                    
                    <div>
                        <div className="flex items-center gap-2">
                            <label htmlFor="ai-temperature" className="font-medium text-text-primary">AI Creativity (Temperature)</label>
                            <Tooltip content="Controls randomness in the AI's output. Lower values are more focused, higher values are more creative." detailedContent={<><p className="font-bold mb-1 text-text-primary">Pro-Tip:</p><ul className="list-disc list-inside space-y-1 text-xs"><li><strong>0.0 - 0.3:</strong> Best for factual, predictable tasks.</li><li><strong>0.4 - 0.7:</strong> A good balance for most tasks.</li><li><strong>0.8 - 1.0:</strong> Ideal for brainstorming or creative insights.</li></ul></>}><InfoIcon className="h-4 w-4 text-text-secondary cursor-help" /></Tooltip>
                        </div>
                        <div className="flex items-center mt-2">
                            <input id="ai-temperature" type="range" min="0" max="1" step="0.1" value={tempSettings.ai.temperature} onChange={(e) => setTempSettings(s => ({ ...s, ai: { ...s.ai, temperature: parseFloat(e.target.value) } }))} className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer" />
                            <span className="ml-4 font-mono text-sm text-text-primary bg-background border border-border rounded-md px-2 py-1 w-16 text-center">{tempSettings.ai.temperature.toFixed(1)}</span>
                        </div>
                    </div>
                    
                    <div>
                        <label htmlFor="ai-language" className="font-medium text-text-primary">AI Language</label>
                        <select id="ai-language" value={tempSettings.ai.aiLanguage} onChange={(e) => setTempSettings(s => ({...s, ai: {...s.ai, aiLanguage: e.target.value as any}}))} className="mt-1 block w-full bg-background border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent">
                            <option value="English">English</option>
                            <option value="German">German</option>
                            <option value="French">French</option>
                            <option value="Spanish">Spanish</option>
                        </select>
                    </div>

                    <div>
                        <div className="flex items-center gap-2">
                            <label htmlFor="custom-preamble" className="font-medium text-text-primary">Custom Preamble (Advanced)</label>
                            <Tooltip content="This text will be added to the beginning of every AI prompt, allowing you to give overriding instructions."><InfoIcon className="h-4 w-4 text-text-secondary cursor-help" /></Tooltip>
                        </div>
                        <textarea id="custom-preamble" rows={3} value={tempSettings.ai.customPreamble} onChange={(e) => setTempSettings(s => ({...s, ai: {...s.ai, customPreamble: e.target.value}}))} className="mt-1 block w-full bg-background border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent" placeholder="e.g., Focus specifically on studies involving human trials."></textarea>
                    </div>
                    <div className="pt-6 border-t border-border">
                        <Toggle checked={tempSettings.ai.enableTldr} onChange={checked => setTempSettings(s => ({...s, ai: {...s.ai, enableTldr: checked}}))}>
                            Enable AI "TL;DR" Summaries
                        </Toggle>
                        <p className="text-xs text-text-secondary mt-2">Adds a button in the article detail view to generate an ultra-short (1-2 sentence) summary of an abstract. This will make an additional API call.</p>
                    </div>
                </div>
            </SettingCard>
            <SettingCard title="Research Assistant" description="Configure the behavior of the quick analysis tool on the 'Research' tab.">
                <div className="space-y-4">
                    <Toggle checked={tempSettings.ai.researchAssistant.autoFetchSimilar} onChange={c => setTempSettings(s => ({...s, ai: {...s.ai, researchAssistant: {...s.ai.researchAssistant, autoFetchSimilar: c}}}))}>
                        Automatically Find Similar Articles
                    </Toggle>
                    <Toggle checked={tempSettings.ai.researchAssistant.autoFetchOnline} onChange={c => setTempSettings(s => ({...s, ai: {...s.ai, researchAssistant: {...s.ai.researchAssistant, autoFetchOnline: c}}}))}>
                        Automatically Find Online Discussions
                    </Toggle>
                </div>
            </SettingCard>
            <SettingCard title="Form Defaults" description="Set default values for the Research Parameters form to speed up your workflow.">
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="def-max-scan" className="block text-sm font-medium text-text-primary mb-1">Default Max Articles to Scan</label>
                            <input type="number" id="def-max-scan" min="10" max="200" value={tempSettings.defaults.maxArticlesToScan} onChange={(e) => setTempSettings(s => ({...s, defaults: {...s.defaults, maxArticlesToScan: parseInt(e.target.value, 10)}}))} className={`block w-full bg-background border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 sm:text-sm ${errors.formDefaults ? 'border-red-500 focus:ring-red-500' : 'border-border focus:ring-brand-accent'}`} />
                        </div>
                        <div>
                            <label htmlFor="def-top-synth" className="block text-sm font-medium text-text-primary mb-1">Default Top Articles to Synthesize</label>
                            <input type="number" id="def-top-synth" min="1" max="20" value={tempSettings.defaults.topNToSynthesize} onChange={(e) => setTempSettings(s => ({...s, defaults: {...s.defaults, topNToSynthesize: parseInt(e.target.value, 10)}}))} className={`block w-full bg-background border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 sm:text-sm ${errors.formDefaults ? 'border-red-500 focus:ring-red-500' : 'border-border focus:ring-brand-accent'}`} />
                        </div>
                        <div>
                            <label htmlFor="def-date-range" className="block text-sm font-medium text-text-primary mb-1">Default Publication Date</label>
                            <select id="def-date-range" value={tempSettings.defaults.defaultDateRange} onChange={e => setTempSettings(s => ({...s, defaults: {...s.defaults, defaultDateRange: e.target.value}}))} className="block w-full bg-background border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent">
                                <option value="any">Any Time</option>
                                <option value="1">Last Year</option>
                                <option value="5">Last 5 Years</option>
                                <option value="10">Last 10 Years</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="def-synthesis-focus" className="block text-sm font-medium text-text-primary mb-1">Default Synthesis Focus</label>
                            <select id="def-synthesis-focus" value={tempSettings.defaults.defaultSynthesisFocus} onChange={e => setTempSettings(s => ({...s, defaults: {...s.defaults, defaultSynthesisFocus: e.target.value}}))} className="block w-full bg-background border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent">
                                <option value="overview">Broad Overview</option>
                                <option value="clinical">Clinical Implications</option>
                                <option value="future">Future Research</option>
                                <option value="gaps">Contradictions & Gaps</option>
                            </select>
                        </div>
                    </div>
                    {errors.formDefaults && <p className="text-xs text-red-400 mt-2">{errors.formDefaults}</p>}
                    <fieldset className="pt-6 border-t border-border">
                        <legend className="text-sm font-medium text-text-primary mb-2">Default Article Types</legend>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                            {ARTICLE_TYPES.map(type => (
                                <div key={type} className="relative flex items-start">
                                    <div className="flex h-5 items-center">
                                        <input id={`def-${type}`} value={type} type="checkbox" checked={tempSettings.defaults.defaultArticleTypes.includes(type)} onChange={handleArticleTypeChange} className="h-4 w-4 rounded border-border bg-background text-brand-accent focus:ring-brand-accent"/>
                                    </div>
                                    <div className="ml-3 text-sm">
                                        <label htmlFor={`def-${type}`} className="font-medium text-text-primary">{type}</label>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </fieldset>
                    <div className="pt-6 border-t border-border">
                        <Toggle checked={tempSettings.defaults.autoSaveReports} onChange={checked => setTempSettings(s => ({...s, defaults: {...s.defaults, autoSaveReports: checked}}))}>
                            Automatically Save New Reports
                        </Toggle>
                    </div>
                </div>
            </SettingCard>
        </div>
    );
};

const KnowledgeBaseSettingsTab: React.FC<{
    tempSettings: Settings;
    setTempSettings: React.Dispatch<React.SetStateAction<Settings>>;
    presets: Preset[];
    setModalState: (state: any) => void;
}> = ({ tempSettings, setTempSettings, presets, setModalState }) => (
    <div className="space-y-8">
        <SettingCard icon={<DatabaseIcon className="w-6 h-6 text-brand-accent"/>} title="Display Defaults" description="Configure the default appearance and behavior of the Knowledge Base.">
            <div className="space-y-6">
                <div>
                <label htmlFor="kb-view" className="block text-sm font-medium text-text-primary mb-1">Default View Mode</label>
                <select id="kb-view" value={tempSettings.knowledgeBase.defaultView} onChange={e => setTempSettings(s => ({...s, knowledgeBase: {...s.knowledgeBase, defaultView: e.target.value as any}}))} className="block w-full bg-background border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent">
                    <option value="grid">Grid View</option>
                    <option value="list">List View</option>
                </select>
                </div>
                    <div>
                <label htmlFor="kb-sort" className="block text-sm font-medium text-text-primary mb-1">Default Sort Order</label>
                <select id="kb-sort" value={tempSettings.knowledgeBase.defaultSort} onChange={e => setTempSettings(s => ({...s, knowledgeBase: {...s.knowledgeBase, defaultSort: e.target.value as any}}))} className="block w-full bg-background border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent">
                    <option value="relevance">Sort by Relevance</option>
                    <option value="newest">Sort by Newest</option>
                </select>
                </div>
                    <div>
                <label htmlFor="kb-page" className="block text-sm font-medium text-text-primary mb-1">Articles Per Page</label>
                <select id="kb-page" value={tempSettings.knowledgeBase.articlesPerPage} onChange={e => setTempSettings(s => ({...s, knowledgeBase: {...s.knowledgeBase, articlesPerPage: parseInt(e.target.value, 10) as any}}))} className="block w-full bg-background border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent">
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                </select>
                </div>
            </div>
        </SettingCard>
            <SettingCard title="Data Cleaning Tools" description="Perform powerful maintenance actions. Merge duplicate articles to keep your library clean, or prune low-relevance articles to focus on the highest quality data.">
            <div className="space-y-4">
                    <button onClick={() => setModalState({ type: 'merge' })} className="w-full text-left p-3 rounded-md bg-background hover:bg-surface-hover border border-border transition-colors">
                    <h4 className="font-semibold text-text-primary">Merge Duplicates</h4>
                    <p className="text-xs text-text-secondary mt-1">Scan the knowledge base for duplicate articles (by PMID) and keep only the version with the highest relevance score.</p>
                </button>
                <button onClick={() => setModalState({ type: 'prune' })} className="w-full text-left p-3 rounded-md bg-background hover:bg-surface-hover border border-border transition-colors">
                    <h4 className="font-semibold text-text-primary">Prune by Relevance Score</h4>
                    <p className="text-xs text-text-secondary mt-1">Permanently remove all articles from the knowledge base that are below a certain relevance score.</p>
                </button>
            </div>
        </SettingCard>
            <SettingCard title="Research Presets" description="Manage your saved research form settings for quick access.">
            {presets.length > 0 ? (
                <div className="space-y-2">
                    {presets.map(preset => (
                        <div key={preset.id} className="flex items-center justify-between p-2 bg-background rounded-md border border-border">
                            <span className="text-sm font-medium text-text-primary">{preset.name}</span>
                            <button onClick={() => setModalState({ type: 'deletePreset', data: preset })} className="p-1.5 rounded-full text-text-secondary hover:bg-surface-hover hover:text-red-400" aria-label={`Delete preset ${preset.name}`}>
                                <TrashIcon className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-text-secondary italic">You have no saved presets. Save one from the Orchestrator form.</p>
            )}
        </SettingCard>
    </div>
);

const ExportSettingsTab: React.FC<{
    tempSettings: Settings;
    setTempSettings: React.Dispatch<React.SetStateAction<Settings>>;
}> = ({ tempSettings, setTempSettings }) => {

    const handleSelectAllCsvColumns = () => {
        setTempSettings(s => ({...s, export: {...s.export, csv: {...s.export.csv, columns: [...CSV_EXPORT_COLUMNS]}}}));
    };
    const handleDeselectAllCsvColumns = () => {
        setTempSettings(s => ({...s, export: {...s.export, csv: {...s.export.csv, columns: []}}}));
    };

    return (
        <div className="space-y-8">
            <SettingCard icon={<ExportIcon className="w-6 h-6 text-brand-primary"/>} title="PDF Export Settings" description="Customize the content and appearance of your PDF exports.">
                <div className="space-y-4">
                    <Toggle checked={tempSettings.export.pdf.includeCoverPage} onChange={c => setTempSettings(s => ({...s, export: {...s.export, pdf: {...s.export.pdf, includeCoverPage: c}}}))}>Include Cover Page</Toggle>
                    <Toggle checked={tempSettings.export.pdf.includeToc} onChange={c => setTempSettings(s => ({...s, export: {...s.export, pdf: {...s.export.pdf, includeToc: c}}}))}>Include Table of Contents</Toggle>
                    <Toggle checked={tempSettings.export.pdf.includeHeader} onChange={c => setTempSettings(s => ({...s, export: {...s.export, pdf: {...s.export.pdf, includeHeader: c}}}))}>Include Header on each page</Toggle>
                    <Toggle checked={tempSettings.export.pdf.includeFooter} onChange={c => setTempSettings(s => ({...s, export: {...s.export, pdf: {...s.export.pdf, includeFooter: c}}}))}>Include Footer with page numbers</Toggle>
                    
                    <div className="pt-4 border-t border-border">
                        <label htmlFor="pdf-preparedFor" className="block text-sm font-medium text-text-primary mb-1">"Prepared For" Name (Optional)</label>
                        <input id="pdf-preparedFor" type="text" value={tempSettings.export.pdf.preparedFor} onChange={e => setTempSettings(s => ({...s, export: {...s.export, pdf: {...s.export.pdf, preparedFor: e.target.value}}}))} className="block w-full bg-background border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent"/>
                    </div>
                    <fieldset className="pt-4 border-t border-border">
                        <legend className="text-sm font-medium text-text-primary mb-2">Include Report Sections</legend>
                        <div className="space-y-3">
                            <Toggle checked={tempSettings.export.pdf.includeSynthesis} onChange={c => setTempSettings(s => ({...s, export: {...s.export, pdf: {...s.export.pdf, includeSynthesis: c}}}))}>Executive Synthesis</Toggle>
                            <Toggle checked={tempSettings.export.pdf.includeInsights} onChange={c => setTempSettings(s => ({...s, export: {...s.export, pdf: {...s.export.pdf, includeInsights: c}}}))}>AI-Generated Insights</Toggle>
                            <Toggle checked={tempSettings.export.pdf.includeQueries} onChange={c => setTempSettings(s => ({...s, export: {...s.export, pdf: {...s.export.pdf, includeQueries: c}}}))}>Generated PubMed Queries</Toggle>
                        </div>
                    </fieldset>
                </div>
            </SettingCard>
            <SettingCard title="CSV Export Settings" description="Choose which data fields to include in CSV exports.">
                    <div className="space-y-4">
                        <div>
                        <label htmlFor="csv-delimiter" className="block text-sm font-medium text-text-primary mb-1">Delimiter</label>
                        <select id="csv-delimiter" value={tempSettings.export.csv.delimiter} onChange={e => setTempSettings(s => ({...s, export: {...s.export, csv: {...s.export.csv, delimiter: e.target.value as any}}}))} className="block w-full max-w-xs bg-background border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent">
                            <option value=",">Comma (,)</option>
                            <option value=";">Semicolon (;)</option>
                            <option value="\t">Tab</option>
                        </select>
                        </div>
                        <fieldset className="pt-4 border-t border-border">
                        <div className="flex justify-between items-center mb-2">
                            <legend className="text-sm font-medium text-text-primary">Include Columns</legend>
                            <div className="flex gap-2">
                                <button type="button" onClick={handleSelectAllCsvColumns} className="text-xs font-semibold text-brand-accent hover:underline">Select All</button>
                                <button type="button" onClick={handleDeselectAllCsvColumns} className="text-xs font-semibold text-brand-accent hover:underline">Deselect All</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {CSV_EXPORT_COLUMNS.map(col => (
                                <Toggle key={col} checked={tempSettings.export.csv.columns.includes(col)} onChange={c => {
                                    const current = tempSettings.export.csv.columns;
                                    const newColumns = c ? [...current, col] : current.filter(item => item !== col);
                                    setTempSettings(s => ({...s, export: {...s.export, csv: {...s.export.csv, columns: newColumns}}}));
                                }}>{col}</Toggle>
                            ))}
                        </div>
                        </fieldset>
                    </div>
            </SettingCard>
                <SettingCard title="Citation Export Settings" description="Customize BibTeX and RIS citation file contents.">
                    <div className="space-y-3">
                    <Toggle checked={tempSettings.export.citation.includeAbstract} onChange={c => setTempSettings(s => ({...s, export: {...s.export, citation: {...s.export.citation, includeAbstract: c}}}))}>Include Abstract</Toggle>
                    <Toggle checked={tempSettings.export.citation.includeKeywords} onChange={c => setTempSettings(s => ({...s, export: {...s.export, citation: {...s.export.citation, includeKeywords: c}}}))}>Include Keywords</Toggle>
                    <Toggle checked={tempSettings.export.citation.includeTags} onChange={c => setTempSettings(s => ({...s, export: {...s.export, citation: {...s.export.citation, includeTags: c}}}))}>Include Custom Tags</Toggle>
                    <Toggle checked={tempSettings.export.citation.includePmcid} onChange={c => setTempSettings(s => ({...s, export: {...s.export, citation: {...s.export.citation, includePmcid: c}}}))}>Include PMCID (PubMed Central ID)</Toggle>
                    </div>
                </SettingCard>
        </div>
    );
};

const DataSettingsTab: React.FC<{
    storageUsage: { totalMB: string; percentage: string; };
    handleExportHistory: () => void;
    handleExportKnowledgeBase: () => void;
    fileInputRef: React.RefObject<HTMLInputElement>;
    handleExportSettings: () => void;
    settingsFileInputRef: React.RefObject<HTMLInputElement>;
    setModalState: (state: any) => void;
    knowledgeBaseLength: number;
    uniqueArticlesLength: number;
}> = ({ storageUsage, handleExportHistory, handleExportKnowledgeBase, fileInputRef, handleExportSettings, settingsFileInputRef, setModalState, knowledgeBaseLength, uniqueArticlesLength }) => (
    <div className="space-y-8">
        <SettingCard icon={<ShieldCheckIcon className="w-6 h-6 text-green-500"/>} title="Local Storage Usage" description="This application stores all data in your browser. Monitor your usage here.">
            <div>
                <div className="flex justify-between mb-1">
                    <span className="text-base font-medium text-brand-accent">Storage Used</span>
                    <span className="text-sm font-medium text-text-primary">{storageUsage.totalMB} MB / ~5.00 MB</span>
                </div>
                <div className="w-full bg-border rounded-full h-2.5">
                    <div className="bg-brand-accent h-2.5 rounded-full" style={{width: `${storageUsage.percentage}%`}}></div>
                </div>
            </div>
        </SettingCard>
        <SettingCard title="Data Backup & Restore" description={`You have ${knowledgeBaseLength} reports containing ${uniqueArticlesLength} unique articles.`}>
            <div className="space-y-3">
                <button onClick={handleExportHistory} className="w-full flex items-center justify-center text-sm px-3 py-2 rounded-md text-text-primary bg-background hover:bg-surface-hover border border-border transition-colors"><DownloadIcon className="h-4 w-4 mr-2" />Export History (All Reports)</button>
                    <button onClick={handleExportKnowledgeBase} className="w-full flex items-center justify-center text-sm px-3 py-2 rounded-md text-text-primary bg-background hover:bg-surface-hover border border-border transition-colors"><DownloadIcon className="h-4 w-4 mr-2" />Export Knowledge Base (All Articles)</button>
                <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center text-sm px-3 py-2 rounded-md text-text-primary bg-background hover:bg-surface-hover border border-border transition-colors"><UploadIcon className="h-4 w-4 mr-2" />Import History / KB</button>
            </div>
        </SettingCard>
            <SettingCard title="Settings Backup & Restore" description="Backup your settings or transfer them to another browser.">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button onClick={handleExportSettings} className="w-full flex items-center justify-center text-sm px-3 py-2 rounded-md text-text-primary bg-background hover:bg-surface-hover border border-border transition-colors"><DownloadIcon className="h-4 w-4 mr-2" />Export Settings</button>
                <button onClick={() => settingsFileInputRef.current?.click()} className="w-full flex items-center justify-center text-sm px-3 py-2 rounded-md text-text-primary bg-background hover:bg-surface-hover border border-border transition-colors"><UploadIcon className="h-4 w-4 mr-2" />Import Settings</button>
            </div>
            </SettingCard>
        
            <SettingCard icon={<TrashIcon className="w-6 h-6 text-red-500" />} title="Danger Zone" description="These actions are irreversible and will permanently delete data.">
            <div className="space-y-4">
                <button onClick={() => setModalState({ type: 'clear' })} className="w-full flex items-center justify-center text-sm px-3 py-2 rounded-md text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors">
                    <TrashIcon className="h-4 w-4 mr-2" />Clear Entire Knowledge Base
                </button>
                <button onClick={() => setModalState({ type: 'reset' })} className="w-full flex items-center justify-center text-sm px-3 py-2 rounded-md text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors">
                    <TrashIcon className="h-4 w-4 mr-2" />Reset All Settings
                </button>
            </div>
        </SettingCard>
    </div>
);


const SettingsView: React.FC<SettingsViewProps> = ({ onClearKnowledgeBase, resetToken, onNavigateToHelpTab }) => {
    const { settings, updateSettings, resetSettings } = useSettings();
    const { knowledgeBase, uniqueArticles, onMergeDuplicates, addKnowledgeBaseEntries, onPruneByRelevance } = useKnowledgeBase();
    const { setNotification, setIsSettingsDirty } = useUI();
    const { presets, removePreset } = usePresets();

    const [tempSettings, setTempSettings] = useState(settings);
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');
    const [modalState, setModalState] = useState<{ type: 'clear' | 'reset' | 'import' | 'prune' | 'merge' | 'confirmModelChange' | 'deletePreset', data?: any } | null>(null);
    const [pruneScore, setPruneScore] = useState(20);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const settingsFileInputRef = useRef<HTMLInputElement>(null);
    const [errors, setErrors] = useState<{ formDefaults?: string }>({});
    const [storageUsage, setStorageUsage] = useState({ totalMB: '0.00', percentage: '0' });

    useEffect(() => {
        try {
            const kbItem = localStorage.getItem('aiResearchKnowledgeBase');
            const settingsItem = localStorage.getItem('aiResearchSettings');
            const presetsItem = localStorage.getItem('aiResearchPresets');
            const kbSize = kbItem ? kbItem.length : 0;
            const settingsSize = settingsItem ? settingsItem.length : 0;
            const presetsSize = presetsItem ? presetsItem.length : 0;
            const totalBytes = kbSize + settingsSize + presetsSize;
            const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
            // Most browsers have a 5MB or 10MB limit. 5MB is a safe assumption for the visualization.
            const percentage = Math.min(100, (totalBytes / (5 * 1024 * 1024)) * 100).toFixed(1);
            setStorageUsage({ totalMB, percentage });
        } catch (e) {
            console.error("Could not calculate storage usage:", e);
        }
    }, [knowledgeBase, presets]);


    const articlesToPruneCount = useMemo(() => {
        if (!uniqueArticles) return 0;
        return uniqueArticles.filter(a => a.relevanceScore < pruneScore).length;
    }, [pruneScore, uniqueArticles]);

    const isObject = (item: any): item is object => {
        return (item && typeof item === 'object' && !Array.isArray(item));
    };

    const deepMerge = (target: any, source: any) => {
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

    const handleSave = () => {
        if (hasErrors) {
            setNotification({id: Date.now(), message: "Please fix the errors before saving.", type: 'error'});
            return;
        }
        updateSettings(tempSettings);
        setNotification({id: Date.now(), message: "Settings saved successfully!", type: 'success'});
    };
    
    const handleCancel = () => {
        setTempSettings(settings);
    };
    
    const handleExportHistory = () => {
        if (knowledgeBase.length === 0) {
            setNotification({id: Date.now(), message: "History is empty. Nothing to export.", type: 'error'});
            return;
        }
        exportHistoryToJson(knowledgeBase);
        setNotification({id: Date.now(), message: "History exported successfully.", type: 'success'});
    };

    const handleExportKnowledgeBase = () => {
        if (uniqueArticles.length === 0) {
            setNotification({id: Date.now(), message: "Knowledge Base is empty. Nothing to export.", type: 'error'});
            return;
        }
        exportKnowledgeBaseToJson(uniqueArticles);
        setNotification({id: Date.now(), message: "Full Knowledge Base (all unique articles) exported successfully.", type: 'success'});
    };


    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedData = JSON.parse(event.target?.result as string);
                // Check for new and old formats
                const dataToImport = importedData.data ? importedData.data : importedData;

                if (Array.isArray(dataToImport) && dataToImport.every(item => 'input' in item && 'report' in item)) {
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
    };

    const handleExportSettings = () => {
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(settings))}`;
        const link = document.createElement("a");
        link.href = jsonString;
        const date = new Date().toISOString().split('T')[0];
        link.download = `ai_research_orchestrator_settings_${date}.json`;
        link.click();
        setNotification({id: Date.now(), message: "Settings exported successfully.", type: 'success'});
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
                if (importedSettings.ai) importedSettings.ai.model = 'gemini-2.5-flash';
                handleConfirmImportSettings(importedSettings);
            } catch (error) {
                setNotification({id: Date.now(), message: `Import failed: ${error instanceof Error ? error.message : "Could not read file."}`, type: 'error'});
            } finally {
                if (settingsFileInputRef.current) settingsFileInputRef.current.value = "";
            }
        };
        reader.readAsText(file);
    };

    const handleConfirmImportSettings = (importedSettings: Partial<Settings>) => {
        const newSettings = deepMerge(settings, importedSettings);
        setTempSettings(newSettings);
        setNotification({id: Date.now(), message: "Settings loaded. Review and click Save Changes.", type: "success"});
    };

    const handlePrune = () => {
        onPruneByRelevance(pruneScore);
        setModalState(null);
    };
    
    const handleResetAllSettings = () => {
        resetSettings();
        setNotification({id: Date.now(), message: "All settings have been reset to their defaults.", type: 'success'});
        setModalState(null);
    };
    
    const handleDeletePreset = (preset: Preset) => {
        removePreset(preset.id);
        setModalState(null);
        setNotification({id: Date.now(), message: `Preset "${preset.name}" deleted.`, type: 'success'});
    };
    
    const tabs = [
        { id: 'general', name: 'General', icon: GearIcon },
        { id: 'ai', name: 'AI', icon: SparklesIcon },
        { id: 'knowledgeBase', name: 'Knowledge Base', icon: DatabaseIcon },
        { id: 'export', name: 'Export', icon: ExportIcon },
        { id: 'data', name: 'Data & Privacy', icon: ShieldCheckIcon },
    ];

    const renderActiveTab = () => {
        switch (activeTab) {
            case 'general':
                return <GeneralSettingsTab tempSettings={tempSettings} setTempSettings={setTempSettings} />;
            case 'ai':
                return <AISettingsTab tempSettings={tempSettings} setTempSettings={setTempSettings} errors={errors} />;
            case 'knowledgeBase':
                return <KnowledgeBaseSettingsTab tempSettings={tempSettings} setTempSettings={setTempSettings} presets={presets} setModalState={setModalState} />;
            case 'export':
                return <ExportSettingsTab tempSettings={tempSettings} setTempSettings={setTempSettings} />;
            case 'data':
                return <DataSettingsTab 
                    storageUsage={storageUsage}
                    handleExportHistory={handleExportHistory}
                    handleExportKnowledgeBase={handleExportKnowledgeBase}
                    fileInputRef={fileInputRef}
                    handleExportSettings={handleExportSettings}
                    settingsFileInputRef={settingsFileInputRef}
                    setModalState={setModalState}
                    knowledgeBaseLength={knowledgeBase.length}
                    uniqueArticlesLength={uniqueArticles.length}
                />;
            default:
                return null;
        }
    };

    return (
        <div className="animate-fadeIn">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-4xl font-bold brand-gradient-text">Settings</h1>
                    <p className="mt-1 text-lg text-text-secondary">Customize your research environment.</p>
                </div>
                <div className="flex items-center space-x-2">
                    <button onClick={handleCancel} disabled={!isDirty} className="px-4 py-2 text-sm font-medium rounded-md text-text-primary bg-background border border-border hover:bg-surface-hover disabled:opacity-50">Cancel</button>
                    <button onClick={handleSave} disabled={!isDirty || hasErrors} className="px-4 py-2 text-sm font-medium rounded-md text-brand-text-on-accent bg-brand-accent hover:bg-opacity-90 disabled:opacity-50">Save Changes</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <aside className="md:col-span-1">
                    <nav className="space-y-1 sticky top-24" role="tablist" aria-label="Settings categories">
                        {tabs.map(tab => (
                            <button 
                                key={tab.id}
                                id={`tab-${tab.id}`}
                                role="tab"
                                aria-selected={activeTab === tab.id}
                                aria-controls={`tabpanel-${tab.id}`}
                                onClick={() => setActiveTab(tab.id as SettingsTab)} 
                                className={`flex items-center w-full text-left px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-brand-accent text-brand-text-on-accent' : 'text-text-primary bg-surface hover:bg-border'}`}
                            >
                                <tab.icon className="h-5 w-5 mr-3 flex-shrink-0" />
                                <span>{tab.name}</span>
                            </button>
                        ))}
                         <div className="pt-4 mt-4 border-t border-border">
                            <button
                                onClick={() => onNavigateToHelpTab('about')}
                                className="w-full text-left px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-text-primary bg-surface hover:bg-border flex items-center"
                            >
                                <InfoIcon className="h-5 w-5 mr-3 text-text-secondary flex-shrink-0" />
                                <span>About & Features</span>
                            </button>
                             <button
                                onClick={() => onNavigateToHelpTab('faq')}
                                className="w-full text-left px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-text-primary bg-surface hover:bg-border flex items-center"
                            >
                                <InfoIcon className="h-5 w-5 mr-3 text-text-secondary flex-shrink-0" />
                                <span>FAQ & Shortcuts</span>
                            </button>
                        </div>
                    </nav>
                </aside>

                <main className="md:col-span-3">
                     <div role="tabpanel" id={`tabpanel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
                        {renderActiveTab()}
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
                    <input type="file" ref={settingsFileInputRef} onChange={handleImportSettings} accept=".json" className="hidden" />
                </main>
            </div>
            {modalState && (
                <>
                {(modalState.type === 'clear') && (
                    <ConfirmationModal
                        onConfirm={() => { onClearKnowledgeBase(); setModalState(null); }}
                        onCancel={() => setModalState(null)}
                        title="Clear Knowledge Base?"
                        message={<>Are you sure you want to delete all <strong>{uniqueArticles.length}</strong> articles from your knowledge base? This action cannot be undone.</>}
                        confirmText="Yes, Delete All"
                    />
                )}
                 {(modalState.type === 'reset') && (
                    <ConfirmationModal
                        onConfirm={handleResetAllSettings}
                        onCancel={() => setModalState(null)}
                        title="Reset All Settings?"
                        message="Are you sure you want to reset all application settings to their default values? This cannot be undone."
                        confirmText="Yes, Reset All"
                    />
                )}
                {(modalState.type === 'import') && (
                    <ConfirmationModal
                        title="Import Knowledge Base"
                        message={<>You are about to import <strong>{modalState.data.length}</strong> new reports. This will be added to your existing knowledge base. Do you want to continue?</>}
                        confirmText="Yes, Import"
                        confirmButtonClass="bg-brand-accent hover:bg-opacity-90"
                        titleClass="text-brand-accent"
                        onConfirm={() => { addKnowledgeBaseEntries(modalState.data); setModalState(null); }}
                        onCancel={() => setModalState(null)}
                    />
                )}
                {(modalState.type === 'prune') && (
                    <Modal onClose={() => setModalState(null)} title="Prune by Relevance Score">
                        <p className="text-sm text-text-secondary mb-4">This will permanently delete all articles from your knowledge base with a relevance score below the value you select.</p>
                        <div className="flex items-center mt-2">
                             <label htmlFor="prune-score-slider" className="sr-only">Prune score</label>
                             <input id="prune-score-slider" type="range" min="0" max="100" step="1" value={pruneScore} onChange={(e) => setPruneScore(parseInt(e.target.value))} className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-brand-accent" />
                            <span className="ml-4 font-mono text-sm text-text-primary bg-background border border-border rounded-md px-2 py-1 w-20 text-center">&lt; {pruneScore}</span>
                        </div>
                        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-300 rounded-md text-center text-sm">
                            This action will permanently delete <strong>{articlesToPruneCount}</strong> article(s).
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button onClick={handlePrune} className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700">Prune Articles</button>
                        </div>
                    </Modal>
                )}
                 {(modalState.type === 'merge') && (
                     <ConfirmationModal
                        title="Merge Duplicates"
                        message="This will scan for duplicate articles and keep only the highest-scored version of each. This helps clean your data. Proceed?"
                        confirmText="Yes, Merge"
                        confirmButtonClass="bg-brand-accent hover:bg-opacity-90"
                        titleClass="text-brand-accent"
                        onConfirm={() => { onMergeDuplicates(); setModalState(null); }}
                        onCancel={() => setModalState(null)}
                    />
                 )}
                 {(modalState.type === 'deletePreset') && (
                     <ConfirmationModal
                        title={`Delete Preset "${modalState.data.name}"?`}
                        message="Are you sure you want to permanently delete this preset? This action cannot be undone."
                        confirmText="Yes, Delete"
                        onConfirm={() => handleDeletePreset(modalState.data)}
                        onCancel={() => setModalState(null)}
                    />
                 )}
                </>
            )}
        </div>
    );
};

export default SettingsView;
