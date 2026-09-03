import React from 'react';
import type { ResearchInput } from '../types';
import { ARTICLE_TYPES } from '../types';
import { CheckIcon } from './icons/CheckIcon';
import { useTranslation } from '../hooks/useTranslation';
import type { TranslationKey } from '../i18n/translations';

const ARTICLE_TYPE_LABEL_KEYS: Record<(typeof ARTICLE_TYPES)[number], TranslationKey> = {
  'Randomized Controlled Trial': 'inputForm.articleType.rct',
  'Meta-Analysis': 'inputForm.articleType.meta',
  'Systematic Review': 'inputForm.articleType.systematic',
  'Observational Study': 'inputForm.articleType.observational',
};

export const SliderInput: React.FC<{
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
      <label htmlFor={id} className="block text-sm font-medium text-text-secondary">
        {label}
      </label>
      <span className="font-mono text-xs font-bold text-brand-accent bg-brand-accent/10 border border-brand-accent/20 rounded-md px-2 py-0.5 shadow-glow">
        {value}
      </span>
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

export const CustomCheckbox: React.FC<{
  id: string;
  value: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label: string;
}> = ({ id, value, checked, onChange, label }) => (
  <label
    htmlFor={id}
    className={`flex items-center cursor-pointer group p-2 rounded-lg border transition-all duration-200 focus-within:ring-2 focus-within:ring-brand-accent focus-within:ring-offset-2 focus-within:ring-offset-surface ${checked ? 'bg-brand-accent/10 border-brand-accent/40 shadow-glow' : 'bg-transparent border-transparent hover:bg-surface-hover hover:border-border'}`}
  >
    <div className="relative flex-shrink-0">
      <input
        id={id}
        value={value}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <div
        aria-hidden="true"
        className={`w-5 h-5 rounded-md border transition-all duration-200 flex items-center justify-center ${checked ? 'bg-brand-accent border-brand-accent shadow-glow' : 'bg-input-bg border-border group-hover:border-brand-accent/50'}`}
      >
        {checked && <CheckIcon className="w-3.5 h-3.5 text-white" />}
      </div>
    </div>
    <span
      className={`ml-3 text-sm font-medium transition-colors ${checked ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'}`}
    >
      {label}
    </span>
  </label>
);

const SelectChevron: React.FC = () => (
  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-text-secondary">
    <svg
      className="h-4 w-4 fill-current"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      aria-hidden
    >
      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
    </svg>
  </div>
);

export interface InputFormOptionsProps {
  formData: ResearchInput;
  errors: { topN?: string };
  allArticleTypesSelected: boolean;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void;
  onArticleTypeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleAllArticleTypes: () => void;
  onToggleArxiv: (checked: boolean) => void;
  onToggleDemo: (checked: boolean) => void;
}

export const InputFormOptions: React.FC<InputFormOptionsProps> = ({
  formData,
  errors,
  allArticleTypesSelected,
  onChange,
  onArticleTypeChange,
  onToggleAllArticleTypes,
  onToggleArxiv,
  onToggleDemo,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="group">
          <label htmlFor="dateRange" className="block text-sm font-semibold text-text-primary mb-2">
            {t('inputForm.date.label')}
          </label>
          <div className="relative">
            <select
              id="dateRange"
              name="dateRange"
              value={formData.dateRange}
              onChange={onChange}
              className="glass-input block w-full rounded-lg shadow-sm py-2.5 px-4 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-accent appearance-none transition-colors"
            >
              <option value="any">{t('inputForm.date.any')}</option>
              <option value="1">{t('inputForm.date.year1')}</option>
              <option value="5">{t('inputForm.date.year5')}</option>
              <option value="10">{t('inputForm.date.year10')}</option>
            </select>
            <SelectChevron />
          </div>
        </div>
        <div className="group">
          <label
            htmlFor="synthesisFocus"
            className="block text-sm font-semibold text-text-primary mb-2"
          >
            {t('inputForm.focus.label')}
          </label>
          <div className="relative">
            <select
              id="synthesisFocus"
              name="synthesisFocus"
              value={formData.synthesisFocus}
              onChange={onChange}
              className="glass-input block w-full rounded-lg shadow-sm py-2.5 px-4 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-accent appearance-none transition-colors"
            >
              <option value="overview">{t('orchestrator.focus.overview')}</option>
              <option value="clinical">{t('orchestrator.focus.clinical')}</option>
              <option value="future">{t('orchestrator.focus.future')}</option>
              <option value="gaps">{t('orchestrator.focus.gaps')}</option>
            </select>
            <SelectChevron />
          </div>
        </div>
      </div>

      <div className="bg-surface/30 border border-border rounded-xl p-5 backdrop-blur-sm">
        <div className="flex justify-between items-center mb-3">
          <legend className="block text-sm font-semibold text-text-primary">
            {t('inputForm.articleTypes.legend')}
          </legend>
          <button
            type="button"
            onClick={onToggleAllArticleTypes}
            className="text-xs font-semibold text-brand-accent hover:text-brand-secondary transition-colors focus-ring-aa rounded-sm"
          >
            {t(
              allArticleTypesSelected
                ? 'inputForm.articleTypes.deselectAll'
                : 'inputForm.articleTypes.selectAll',
            )}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {ARTICLE_TYPES.map((type) => (
            <CustomCheckbox
              key={type}
              id={type}
              value={type}
              checked={formData.articleTypes.includes(type)}
              onChange={onArticleTypeChange}
              label={t(ARTICLE_TYPE_LABEL_KEYS[type])}
            />
          ))}
        </div>
      </div>

      <div className="bg-surface/30 border border-border rounded-xl p-5 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-1.5 w-1.5 rounded-full bg-accent-cyan shadow-[0_0_8px_var(--color-accent-cyan)]" />
          <legend className="text-sm font-semibold text-text-primary">
            {t('inputForm.sources.legend')}
          </legend>
        </div>
        <div className="space-y-2">
          <div className="flex items-center p-2 rounded-lg bg-brand-accent/5 border border-brand-accent/20 gap-2.5">
            <div className="w-5 h-5 rounded-md bg-brand-accent border border-brand-accent flex items-center justify-center flex-shrink-0">
              <CheckIcon className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-medium text-text-primary">
              {t('inputForm.sources.pubmed')}
            </span>
            <span className="text-xs text-text-secondary ml-auto">
              {t('inputForm.sources.pubmed_hint')}
            </span>
          </div>
          <CustomCheckbox
            id="includeArxiv"
            value="arxiv"
            checked={formData.includeArxiv ?? false}
            onChange={(e) => onToggleArxiv(e.target.checked)}
            label={t('inputForm.sources.arxiv')}
          />
          {formData.includeArxiv && (
            <p className="text-[11px] text-text-secondary pl-2 leading-relaxed">
              {t('inputForm.sources.arxiv_hint')}
            </p>
          )}
          <CustomCheckbox
            id="educationalDemoMode"
            value="educationalDemo"
            checked={formData.educationalDemoMode ?? false}
            onChange={(e) => onToggleDemo(e.target.checked)}
            label={t('inputForm.sources.educationalDemo')}
          />
          {formData.educationalDemoMode && (
            <p className="text-[11px] text-amber-700 dark:text-amber-300 pl-2 leading-relaxed">
              {t('inputForm.sources.educationalDemo_hint')}
            </p>
          )}
        </div>
      </div>

      <div className="bg-surface/30 border border-border rounded-xl p-5 space-y-6 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-1.5 w-1.5 rounded-full bg-accent-cyan shadow-[0_0_8px_var(--color-accent-cyan)]" />
          <legend className="text-sm font-semibold text-text-primary">
            {t('inputForm.workload.legend')}
          </legend>
        </div>
        <SliderInput
          label={t('inputForm.workload.max_scan')}
          id="maxArticlesToScan"
          value={formData.maxArticlesToScan}
          onChange={onChange}
          min={10}
          max={200}
          step={10}
        />
        <SliderInput
          label={t('inputForm.workload.top_n')}
          id="topNToSynthesize"
          value={formData.topNToSynthesize}
          onChange={onChange}
          min={1}
          max={20}
        />
        {errors.topN && (
          <p className="text-xs text-red-400 font-medium bg-red-500/10 border border-red-500/20 p-2 rounded-md text-center">
            {errors.topN}
          </p>
        )}
      </div>
    </div>
  );
};
