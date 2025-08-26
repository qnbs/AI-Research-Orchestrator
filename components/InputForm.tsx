import React, { useState } from 'react';
import type { ResearchInput } from '../types';
import { SearchIcon } from './icons/SearchIcon';

interface InputFormProps {
  onSubmit: (data: ResearchInput) => void;
  isLoading: boolean;
}

const ARTICLE_TYPES = [
  'Randomized Controlled Trial', 
  'Meta-Analysis', 
  'Systematic Review', 
  'Observational Study'
];

export const InputForm: React.FC<InputFormProps> = ({ onSubmit, isLoading }) => {
  const [formData, setFormData] = useState<ResearchInput>({
    researchTopic: 'The effect of intermittent fasting on cognitive function in adults',
    dateRange: '5',
    articleTypes: ['Randomized Controlled Trial', 'Systematic Review'],
    synthesisFocus: 'overview',
    maxArticlesToScan: 50,
    topNToSynthesize: 5,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value, 10) : value,
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
    onSubmit(formData);
  };

  return (
    <div className="bg-dark-surface rounded-lg border border-dark-border shadow-2xl shadow-black/20 p-6">
      <h2 className="text-xl font-bold mb-4 text-brand-accent">Research Parameters</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="researchTopic" className="block text-sm font-medium text-dark-text-secondary mb-1">Primary Research Topic or Question</label>
          <textarea
            id="researchTopic"
            name="researchTopic"
            rows={3}
            value={formData.researchTopic}
            onChange={handleChange}
            className="block w-full bg-dark-bg border border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-brand-accent sm:text-sm placeholder-dark-text-secondary"
            required
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label htmlFor="dateRange" className="block text-sm font-medium text-dark-text-secondary mb-1">Publication Date</label>
                <select 
                    id="dateRange"
                    name="dateRange"
                    value={formData.dateRange}
                    onChange={handleChange}
                    className="block w-full bg-dark-bg border border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-brand-accent sm:text-sm"
                >
                    <option value="any">Any Time</option>
                    <option value="1">Last Year</option>
                    <option value="5">Last 5 Years</option>
                    <option value="10">Last 10 Years</option>
                </select>
            </div>
            <div>
                 <label htmlFor="synthesisFocus" className="block text-sm font-medium text-dark-text-secondary mb-1">Synthesis Focus</label>
                <select 
                    id="synthesisFocus"
                    name="synthesisFocus"
                    value={formData.synthesisFocus}
                    onChange={handleChange}
                    className="block w-full bg-dark-bg border border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-brand-accent sm:text-sm"
                >
                    <option value="overview">Broad Overview</option>
                    <option value="clinical">Clinical Implications</option>
                    <option value="future">Future Research</option>
                    <option value="gaps">Contradictions & Gaps</option>
                </select>
            </div>
        </div>

        <div>
            <label className="block text-sm font-medium text-dark-text-secondary">Article Types</label>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
                {ARTICLE_TYPES.map(type => (
                    <div key={type} className="relative flex items-start">
                        <div className="flex h-5 items-center">
                            <input 
                                id={type}
                                value={type}
                                type="checkbox"
                                checked={formData.articleTypes.includes(type)}
                                onChange={handleArticleTypeChange}
                                className="h-4 w-4 rounded border-dark-border bg-dark-bg text-brand-accent focus:ring-brand-accent"
                            />
                        </div>
                        <div className="ml-3 text-sm">
                            <label htmlFor={type} className="font-medium text-dark-text-primary">{type}</label>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="maxArticlesToScan" className="block text-sm font-medium text-dark-text-secondary mb-1">Max Articles to Scan</label>
            <input
              type="number"
              id="maxArticlesToScan"
              name="maxArticlesToScan"
              value={formData.maxArticlesToScan}
              onChange={handleChange}
              min="10"
              max="200"
              className="block w-full bg-dark-bg border border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-brand-accent sm:text-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="topNToSynthesize" className="block text-sm font-medium text-dark-text-secondary mb-1">Top Articles to Synthesize</label>
            <input
              type="number"
              id="topNToSynthesize"
              name="topNToSynthesize"
              value={formData.topNToSynthesize}
              onChange={handleChange}
              min="1"
              max="20"
              className="block w-full bg-dark-bg border border-dark-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-brand-accent sm:text-sm"
              required
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-transparent shadow-sm text-sm font-semibold rounded-md text-dark-bg bg-brand-accent hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-surface focus:ring-brand-accent disabled:bg-dark-border disabled:text-dark-text-secondary disabled:cursor-not-allowed transition-colors"
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
  );
};
