
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
        <label htmlFor={id} className="block text-sm font-medium text-text-secondary mb-2">{label}</label>
        <div className="flex items-center gap-4">
            <input
                type="range"
                id={id}
                name={id}
                value={value}
                onChange={onChange}
                min={min}
                max={max}
                step={step}
                className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-brand-accent"
                aria-labelledby={id}
                aria-valuetext={String(value)}
            />
            <span className="font-mono text-sm text-text-primary bg-input-bg border border-border rounded-md px-2 py-1 w-16 text-center">{value}</span>
        </div>
    </div>
);


const CustomCheckbox: React.FC<{ id: string; value: string; checked: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; label: string; }> = ({ id, value, checked, onChange, label }) => (
    <label htmlFor={id} className="flex items-center cursor-pointer group">
        <div className="relative">
            <input 
                id={id}
                value={value}
                type="checkbox"
                checked={checked}
                onChange={onChange}
                className="sr-only" // Hide original checkbox
            />
            <div aria-hidden="true" className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center group-hover:border-brand-accent ${checked ? 'bg-brand-accent border-brand-accent' : 'bg-surface border-border'}`}>
                {checked && <CheckIcon className="w-4 h-4 text-white" />}
            </div>
        </div>
        <span className="ml-3 text-sm font-medium text-text-primary group-hover:text-brand-accent transition-colors">{label}</span>
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
    <div className="bg-surface rounded-lg border border-border shadow-lg p-6 sm:p-8">
      <div className="flex justify-between items-start mb-6">
          <div className="flex items-center">
            <SparklesIcon className="h-8 w-8 brand-gradient-text mr-3" />
            <div>
                <h2 className="text-2xl font-bold text-text-primary">Research Parameters</h2>
                <p className="text-sm text-text-secondary">Define the scope of your literature review.</p>
            </div>
          </div>
           <div className="flex items-center gap-2">
                <select onChange={handleLoadPreset} defaultValue="" className="block w-full max-w-xs bg-input-bg border border-border rounded-md shadow-sm py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent transition-colors">
                    <option value="" disabled>Load preset...</option>
                    {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <button type="button" onClick={() => setIsPresetModalOpen(true)} className="inline-flex items-center px-3 py-1.5 border border-border text-xs font-medium rounded-md shadow-sm text-text-primary bg-surface hover:bg-surface-hover transition-colors">
                    <BookmarkSquareIcon className="h-4 w-4 mr-1.5" />
                    Save Preset
                </button>
            </div>
      </div>
      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-8" role="search">
        <fieldset>
          <label htmlFor="researchTopic" className="block text-sm font-semibold text-text-primary mb-2">Primary Research Topic or Question</label>
          <textarea
            id="researchTopic"
            name="researchTopic"
            rows={3}
            value={formData.researchTopic}
            onChange={handleChange}
            className="block w-full bg-input-bg border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-brand-accent sm:text-sm placeholder-text-secondary transition-colors"
            required
            placeholder="e.g., The impact of exercise on neuroplasticity in elderly populations"
          />
        </fieldset>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <fieldset>
                <label htmlFor="dateRange" className="block text-sm font-semibold text-text-primary mb-2">Publication Date</label>
                <select 
                    id="dateRange"
                    name="dateRange"
                    value={formData.dateRange}
                    onChange={handleChange}
                    className="block w-full bg-input-bg border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-brand-accent sm:text-sm transition-colors"
                >
                    <option value="any">Any Time</option>
                    <option value="1">Last Year</option>
                    <option value="5">Last 5 Years</option>
                    <option value="10">Last 10 Years</option>
                </select>
            </fieldset>
            <fieldset>
                 <label htmlFor="synthesisFocus" className="block text-sm font-semibold text-text-primary mb-2">Synthesis Focus</label>
                <select 
                    id="synthesisFocus"
                    name="synthesisFocus"
                    value={formData.synthesisFocus}
                    onChange={handleChange}
                    className="block w-full bg-input-bg border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-brand-accent sm:text-sm transition-colors"
                >
                    <option value="overview">Broad Overview</option>
                    <option value="clinical">Clinical Implications</option>
                    <option value="future">Future Research</option>
                    <option value="gaps">Contradictions & Gaps</option>
                </select>
            </fieldset>
        </div>

        <fieldset className="bg-background/50 border border-border rounded-lg p-4">
            <div className="flex justify-between items-center">
                <legend className="block text-sm font-semibold text-text-primary">Article Types</legend>
                <button
                    type="button"
                    onClick={handleToggleAllArticleTypes}
                    className="text-xs font-semibold text-brand-accent hover:underline focus:outline-none"
                    aria-label={allArticleTypesSelected ? 'Deselect all article types' : 'Select all article types'}
                >
                    {allArticleTypesSelected ? 'Deselect All' : 'Select All'}
                </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
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
        </fieldset>
      
        <fieldset className="bg-background/50 border border-border rounded-lg p-4 space-y-6">
            <div>
                <legend className="text-sm font-semibold text-text-primary mb-1">AI Agent Configuration</legend>
                <p className="text-xs text-text-secondary">Control the scope of the AI's search and synthesis process.</p>
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
             {errors.topN && <p className="text-xs text-red-400 -mt-3 text-right col-span-2">{errors.topN}</p>}
        </fieldset>

        <button
          type="submit"
          disabled={isLoading || hasErrors}
          className="w-full inline-flex justify-center items-center py-3 px-4 border border-transparent shadow-md text-base font-semibold rounded-md text-brand-text-on-accent bg-gradient-to-r from-brand-primary to-accent-cyan hover:shadow-lg hover:shadow-brand-accent/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-brand-accent disabled:from-border disabled:to-border disabled:text-text-secondary disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
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
            <div ref={modalRef} className="bg-surface rounded-lg border border-border shadow-2xl p-6 w-full max-w-sm m-4">
                <h3 className="text-lg font-bold brand-gradient-text">Save Preset</h3>
                <div className="mt-2 text-text-secondary">
                    <label htmlFor="presetName" className="block text-sm font-medium text-text-primary mb-1">Preset Name</label>
                    <input
                        type="text"
                        id="presetName"
                        value={newPresetName}
                        onChange={(e) => setNewPresetName(e.target.value)}
                        className="block w-full bg-input-bg border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent sm:text-sm"
                        placeholder="e.g., Clinical Trials (Last 5 Years)"
                        autoFocus
                    />
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={() => setIsPresetModalOpen(false)} className="px-4 py-2 border border-border text-sm font-medium rounded-md shadow-sm text-text-primary bg-surface hover:bg-surface-hover">
                        Cancel
                    </button>
                    <button onClick={handleSavePreset} disabled={!newPresetName.trim()} className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-accent hover:bg-opacity-90 disabled:opacity-50">
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