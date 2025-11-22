
import React, { useState, useEffect, memo } from 'react';
import type { ResearchInput, Settings, Preset } from '../types';
import { ARTICLE_TYPES } from '../types';
import { usePresets } from '../contexts/PresetContext';
import { SearchIcon } from './icons/SearchIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { CheckIcon } from './icons/CheckIcon';
import { BookmarkSquareIcon } from './icons/BookmarkSquareIcon';

interface InputFormProps {
  onSubmit: (data: ResearchInput) => void;
  isLoading: boolean;
  defaultSettings: Settings['defaults'];
  prefilledTopic: string | null;
  onPrefillConsumed: () => void;
}

const FORM_STATE_KEY = 'aiResearchFormState';

const SliderInput: React.FC<{
    label: string;
    id: string;
    value: number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    min: number;
    max: number;
    step?: number;
}> = ({ label, id, value, onChange, min, max, step = 1 }) => (
    <div>
        <div className="flex justify-between mb-2">
             <label htmlFor={id} className="block text-sm font-medium text-text-secondary">{label}</label>
             <span className="font-mono text-xs font-bold text-brand-accent bg-brand-accent/10 border border-brand-accent/20 rounded-md px-2 py-0.5 shadow-[0_0_10px_rgba(56,189,248,0.2)]">{value}</span>
        </div>
        <input
            type="range"
            id={id}
            name={id}
            value={value}
            onChange={onChange}
            min={min}
            max={max}
            step={step}
            className="w-full h-2 bg-input-bg border border-border/50 rounded-lg appearance-none cursor-pointer accent-brand-accent hover:accent-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
            aria-labelledby={id}
            aria-valuetext={String(value)}
        />
    </div>
);


const CustomCheckbox: React.FC<{ id: string; value: string; checked: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; label: string; }> = ({ id, value, checked, onChange, label }) => (
    <label htmlFor={id} className={`flex items-center cursor-pointer group p-2 rounded-lg border transition-all duration-200 ${checked ? 'bg-brand-accent/10 border-brand-accent/40 shadow-[0_0_10px_rgba(56,189,248,0.1)]' : 'bg-transparent border-transparent hover:bg-surface-hover hover:border-border'}`}>
        <div className="relative flex-shrink-0">
            <input 
                id={id}
                value={value}
                type="checkbox"
                checked={checked}
                onChange={onChange}
                className="sr-only" // Hide original checkbox
            />
            <div aria-hidden="true" className={`w-5 h-5 rounded-md border transition-all duration-200 flex items-center justify-center ${checked ? 'bg-brand-accent border-brand-accent shadow-glow' : 'bg-input-bg border-border group-hover:border-brand-accent/50'}`}>
                {checked && <CheckIcon className="w-3.5 h-3.5 text-white" />}
            </div>
        </div>
        <span className={`ml-3 text-sm font-medium transition-colors ${checked ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'}`}>{label}</span>
    </label>
);


const InputFormComponent: React.FC<InputFormProps> = ({ onSubmit, isLoading, defaultSettings, prefilledTopic, onPrefillConsumed }) => {
  const [formData, setFormData] = useState<ResearchInput>(() => {
    try {
        const savedState = sessionStorage.getItem(FORM_STATE_KEY);
        if (savedState) {
            return JSON.parse(savedState);
        }
    } catch (e) {
        console.error("Could not parse form state from sessionStorage", e);
    }
    // Default initial state from settings
    return {
      researchTopic: '',
      dateRange: defaultSettings.defaultDateRange,
      articleTypes: [...defaultSettings.defaultArticleTypes],
      synthesisFocus: defaultSettings.defaultSynthesisFocus,
      maxArticlesToScan: defaultSettings.maxArticlesToScan,
      topNToSynthesize: defaultSettings.topNToSynthesize,
    };
  });
  const [errors, setErrors] = useState<{ topN?: string }>({});
  const { presets, addPreset } = usePresets();
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const modalRef = useFocusTrap<HTMLDivElement>(isPresetModalOpen);

  useEffect(() => {
    try {
        sessionStorage.setItem(FORM_STATE_KEY, JSON.stringify(formData));
    } catch (e) {
        console.error("Could not save form state to sessionStorage", e);
    }
  }, [formData]);


  useEffect(() => {
    if (prefilledTopic) {
      setFormData(prev => ({ ...prev, researchTopic: prefilledTopic }));
      onPrefillConsumed();
    }
  }, [prefilledTopic, onPrefillConsumed]);


  useEffect(() => {
    // Validation effect whenever relevant form data changes
    if (formData.topNToSynthesize > formData.maxArticlesToScan) {
      setErrors({ topN: 'Cannot synthesize more articles than are scanned.' });
    } else {
      setErrors({});
    }
  }, [formData.topNToSynthesize, formData.maxArticlesToScan]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'range' || type === 'number' ? parseInt(value, 10) : value,
    }));
  };

  const handleArticleTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setFormData(prev => {
      const currentTypes = prev.articleTypes;
      if (checked) {
        return { ...prev, articleTypes: [...currentTypes, value] };
      } else {
        return { ...prev, articleTypes: currentTypes.filter(type => type !== value) };
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(errors).length === 0 && !isLoading) {
        onSubmit(formData);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        if (Object.keys(errors).length === 0 && !isLoading) {
            onSubmit(formData);
        }
    }
  };
  
  const handleSavePreset = () => {
    if (newPresetName.trim()) {
      addPreset(newPresetName.trim(), formData);
      setNewPresetName('');
      setIsPresetModalOpen(false);
    }
  };
  
  const handleLoadPreset = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const presetId = e.target.value;
    const presetToLoad = presets.find(p => p.id === presetId);
    if (presetToLoad) {
      setFormData(presetToLoad.settings);
    }
  };

  const hasErrors = Object.keys(errors).length > 0;
  
  const allArticleTypesSelected = formData.articleTypes.length === ARTICLE_TYPES.length;

  const handleToggleAllArticleTypes = () => {
    setFormData(prev => ({
      ...prev,
      articleTypes: allArticleTypesSelected ? [] : [...ARTICLE_TYPES],
    }));
  };

  return (
    <>
    <div className="glass-panel rounded-xl p-6 sm:p-8 transition-all duration-300 hover:shadow-lg">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div className="flex items-center">
            <div className="p-2 bg-brand-accent/10 rounded-lg mr-3 border border-brand-accent/20 shadow-[0_0_10px_rgba(56,189,248,0.1)]">
                <SparklesIcon className="h-6 w-6 text-brand-accent" />
            </div>
            <div>
                <h2 className="text-xl font-bold text-text-primary tracking-tight">Research Parameters</h2>
                <p className="text-xs text-text-secondary mt-0.5">Define the scope for the AI agents.</p>
            </div>
          </div>
           <div className="flex items-center gap-3 w-full sm:w-auto">
                <select onChange={handleLoadPreset} defaultValue="" className="glass-input block w-full sm:w-40 rounded-lg py-1.5 px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-accent transition-colors">
                    <option value="" disabled>Load preset...</option>
                    {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <button type="button" onClick={() => setIsPresetModalOpen(true)} className="inline-flex flex-shrink-0 items-center px-3 py-1.5 border border-border text-xs font-medium rounded-lg shadow-sm text-text-secondary bg-surface hover:bg-surface-hover hover:text-text-primary transition-colors">
                    <BookmarkSquareIcon className="h-4 w-4 mr-1.5" />
                    Save
                </button>
            </div>
      </div>
      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-8" role="search">
        <div className="group">
          <label htmlFor="researchTopic" className="block text-sm font-semibold text-text-primary mb-2">Primary Research Topic or Question</label>
          <textarea
            id="researchTopic"
            name="researchTopic"
            rows={3}
            value={formData.researchTopic}
            onChange={handleChange}
            className="glass-input block w-full rounded-lg shadow-inner py-3 px-4 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-brand-accent transition-all text-base placeholder-text-secondary/50"
            required
            placeholder="e.g., What are the long-term neurocognitive effects of COVID-19?"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="group">
                <label htmlFor="dateRange" className="block text-sm font-semibold text-text-primary mb-2">Publication Date</label>
                <div className="relative">
                    <select 
                        id="dateRange"
                        name="dateRange"
                        value={formData.dateRange}
                        onChange={handleChange}
                        className="glass-input block w-full rounded-lg shadow-sm py-2.5 px-4 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-accent appearance-none transition-colors"
                    >
                        <option value="any">Any Time</option>
                        <option value="1">Last Year</option>
                        <option value="5">Last 5 Years</option>
                        <option value="10">Last 10 Years</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-text-secondary">
                        <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                </div>
            </div>
            <div className="group">
                 <label htmlFor="synthesisFocus" className="block text-sm font-semibold text-text-primary mb-2">Synthesis Focus</label>
                 <div className="relative">
                    <select 
                        id="synthesisFocus"
                        name="synthesisFocus"
                        value={formData.synthesisFocus}
                        onChange={handleChange}
                        className="glass-input block w-full rounded-lg shadow-sm py-2.5 px-4 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-accent appearance-none transition-colors"
                    >
                        <option value="overview">Broad Overview</option>
                        <option value="clinical">Clinical Implications</option>
                        <option value="future">Future Research</option>
                        <option value="gaps">Contradictions & Gaps</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-text-secondary">
                        <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                </div>
            </div>
        </div>

        <div className="bg-surface/30 border border-border rounded-xl p-5 backdrop-blur-sm">
            <div className="flex justify-between items-center mb-3">
                <legend className="block text-sm font-semibold text-text-primary">Article Types</legend>
                <button
                    type="button"
                    onClick={handleToggleAllArticleTypes}
                    className="text-xs font-semibold text-brand-accent hover:text-brand-secondary transition-colors focus:outline-none"
                >
                    {allArticleTypesSelected ? 'Deselect All' : 'Select All'}
                </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
                {ARTICLE_TYPES.map(type => (
                    <CustomCheckbox 
                        key={type} 
                        id={type} 
                        value={type} 
                        checked={formData.articleTypes.includes(type)}
                        onChange={handleArticleTypeChange} 
                        label={type} 
                    />
                ))}
            </div>
        </div>
      
        <div className="bg-surface/30 border border-border rounded-xl p-5 space-y-6 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
                 <div className="h-1.5 w-1.5 rounded-full bg-accent-cyan shadow-[0_0_8px_var(--color-accent-cyan)]"></div>
                 <legend className="text-sm font-semibold text-text-primary">Agent Workload</legend>
            </div>
            <SliderInput 
                label="Max Articles to Scan"
                id="maxArticlesToScan"
                value={formData.maxArticlesToScan}
                onChange={handleChange}
                min={10}
                max={200}
                step={10}
            />
            <SliderInput 
                label="Top Articles to Synthesize"
                id="topNToSynthesize"
                value={formData.topNToSynthesize}
                onChange={handleChange}
                min={1}
                max={20}
            />
             {errors.topN && <p className="text-xs text-red-400 font-medium bg-red-500/10 border border-red-500/20 p-2 rounded-md text-center">{errors.topN}</p>}
        </div>

        <button
          type="submit"
          disabled={isLoading || hasErrors}
          className="w-full inline-flex justify-center items-center py-3.5 px-4 border border-transparent shadow-lg shadow-brand-accent/20 text-base font-bold rounded-lg text-brand-text-on-accent bg-gradient-to-r from-brand-primary to-accent-cyan hover:shadow-glow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-brand-accent disabled:from-border disabled:to-border disabled:text-text-secondary disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99]"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="tracking-wide">Initializing Agents...</span>
            </>
          ) : (
            <>
              <SearchIcon className="h-5 w-5 mr-2" />
              Start Research
            </>
          )}
        </button>
      </form>
    </div>
    {isPresetModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm animate-fadeIn" style={{ animationDuration: '150ms' }}>
            <div ref={modalRef} className="glass-panel rounded-xl p-6 w-full max-w-sm m-4 shadow-2xl">
                <h3 className="text-lg font-bold brand-gradient-text">Save Preset</h3>
                <div className="mt-4">
                    <label htmlFor="presetName" className="block text-sm font-medium text-text-primary mb-1">Preset Name</label>
                    <input
                        type="text"
                        id="presetName"
                        value={newPresetName}
                        onChange={(e) => setNewPresetName(e.target.value)}
                        className="glass-input block w-full rounded-lg shadow-sm py-2 px-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-accent sm:text-sm"
                        placeholder="e.g., Clinical Trials (Last 5 Years)"
                        autoFocus
                    />
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={() => setIsPresetModalOpen(false)} className="px-4 py-2 border border-border text-sm font-medium rounded-lg shadow-sm text-text-primary bg-surface hover:bg-surface-hover transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleSavePreset} disabled={!newPresetName.trim()} className="px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-brand-accent hover:bg-opacity-90 disabled:opacity-50 transition-colors">
                        Save
                    </button>
                </div>
            </div>
        </div>
    )}
    </>
  );
};

export const InputForm = memo(InputFormComponent);
