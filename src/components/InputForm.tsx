import React, { useState, useEffect, memo } from 'react';
import type { ResearchInput, Settings } from '../types';
import { ARTICLE_TYPES } from '../types';
import { usePresets } from '../contexts/PresetContext';
import { SearchIcon } from './icons/SearchIcon';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { CheckIcon } from './icons/CheckIcon';
import { InputFormHeader } from './InputFormHeader';
import { useTranslation } from '../hooks/useTranslation';
import type { TranslationKey } from '../i18n/translations';

interface InputFormProps {
  onSubmit: (data: ResearchInput) => void;
  isLoading: boolean;
  defaultSettings: Settings['defaults'];
  prefilledTopic: string | null;
  onPrefillConsumed: () => void;
}

const FORM_STATE_KEY = 'aiResearchFormState';

const ARTICLE_TYPE_LABEL_KEYS: Record<(typeof ARTICLE_TYPES)[number], TranslationKey> = {
  'Randomized Controlled Trial': 'inputForm.articleType.rct',
  'Meta-Analysis': 'inputForm.articleType.meta',
  'Systematic Review': 'inputForm.articleType.systematic',
  'Observational Study': 'inputForm.articleType.observational',
};

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

const CustomCheckbox: React.FC<{
  id: string;
  value: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label: string;
}> = ({ id, value, checked, onChange, label }) => (
  <label
    htmlFor={id}
    className={`flex items-center cursor-pointer group p-2 rounded-lg border transition-all duration-200 ${checked ? 'bg-brand-accent/10 border-brand-accent/40 shadow-glow' : 'bg-transparent border-transparent hover:bg-surface-hover hover:border-border'}`}
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

const InputFormComponent: React.FC<InputFormProps> = ({
  onSubmit,
  isLoading,
  defaultSettings,
  prefilledTopic,
  onPrefillConsumed,
}) => {
  const [formData, setFormData] = useState<ResearchInput>(() => {
    try {
      const savedState = sessionStorage.getItem(FORM_STATE_KEY);
      if (savedState) {
        return { includeArxiv: false, ...JSON.parse(savedState) };
      }
    } catch (e) {
      console.error('Could not parse form state from sessionStorage', e);
    }
    return {
      researchTopic: '',
      dateRange: defaultSettings.defaultDateRange,
      articleTypes: [...defaultSettings.defaultArticleTypes],
      synthesisFocus: defaultSettings.defaultSynthesisFocus,
      maxArticlesToScan: defaultSettings.maxArticlesToScan,
      topNToSynthesize: defaultSettings.topNToSynthesize,
      includeArxiv: false,
    };
  });
  const { t } = useTranslation();
  const errors: { topN?: string } =
    formData.topNToSynthesize > formData.maxArticlesToScan
      ? { topN: t('orchestrator.error.topn_exceeds_max') }
      : {};
  const { presets, addPreset } = usePresets();
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const closePresetModal = () => setIsPresetModalOpen(false);
  const modalRef = useFocusTrap<HTMLDivElement>(isPresetModalOpen, {
    onEscape: closePresetModal,
    lockScroll: true,
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(FORM_STATE_KEY, JSON.stringify(formData));
    } catch (e) {
      console.error('Could not save form state to sessionStorage', e);
    }
  }, [formData]);

  useEffect(() => {
    if (prefilledTopic) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- consumes an external one-shot prefill signal, acknowledging it via onPrefillConsumed.
      setFormData((prev) => ({ ...prev, researchTopic: prefilledTopic }));
      onPrefillConsumed();
    }
  }, [prefilledTopic, onPrefillConsumed]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'range' || type === 'number' ? parseInt(value, 10) : value,
    }));
  };

  const handleArticleTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setFormData((prev) => {
      const currentTypes = prev.articleTypes;
      if (checked) {
        return { ...prev, articleTypes: [...currentTypes, value] };
      }
      return { ...prev, articleTypes: currentTypes.filter((type) => type !== value) };
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
      e.preventDefault();
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
    const presetToLoad = presets.find((p) => p.id === presetId);
    if (presetToLoad) {
      setFormData(presetToLoad.settings);
    }
  };

  const hasErrors = Object.keys(errors).length > 0;
  const allArticleTypesSelected = formData.articleTypes.length === ARTICLE_TYPES.length;

  const handleToggleAllArticleTypes = () => {
    setFormData((prev) => ({
      ...prev,
      articleTypes: allArticleTypesSelected ? [] : [...ARTICLE_TYPES],
    }));
  };

  return (
    <>
      <div className="glass-panel rounded-xl p-6 sm:p-8 transition-all duration-300 hover:shadow-lg">
        <InputFormHeader
          presets={presets}
          onLoadPreset={handleLoadPreset}
          onOpenPresetModal={() => setIsPresetModalOpen(true)}
        />
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Ctrl/Cmd+Enter form-wide submit shortcut; the form already contains real interactive child controls (inputs, buttons). */}
        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-8" role="search">
          <div className="group">
            <label
              htmlFor="researchTopic"
              className="block text-sm font-semibold text-text-primary mb-2"
            >
              {t('inputForm.topic.label')}
            </label>
            <textarea
              id="researchTopic"
              name="researchTopic"
              rows={3}
              value={formData.researchTopic}
              onChange={handleChange}
              className="glass-input block w-full rounded-lg shadow-inner py-3 px-4 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-brand-accent transition-all text-base"
              required
              placeholder={t('inputForm.topic.placeholder')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="group">
              <label
                htmlFor="dateRange"
                className="block text-sm font-semibold text-text-primary mb-2"
              >
                {t('inputForm.date.label')}
              </label>
              <div className="relative">
                <select
                  id="dateRange"
                  name="dateRange"
                  value={formData.dateRange}
                  onChange={handleChange}
                  className="glass-input block w-full rounded-lg shadow-sm py-2.5 px-4 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-accent appearance-none transition-colors"
                >
                  <option value="any">{t('inputForm.date.any')}</option>
                  <option value="1">{t('inputForm.date.year1')}</option>
                  <option value="5">{t('inputForm.date.year5')}</option>
                  <option value="10">{t('inputForm.date.year10')}</option>
                </select>
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
                  onChange={handleChange}
                  className="glass-input block w-full rounded-lg shadow-sm py-2.5 px-4 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-accent appearance-none transition-colors"
                >
                  <option value="overview">{t('orchestrator.focus.overview')}</option>
                  <option value="clinical">{t('orchestrator.focus.clinical')}</option>
                  <option value="future">{t('orchestrator.focus.future')}</option>
                  <option value="gaps">{t('orchestrator.focus.gaps')}</option>
                </select>
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
                onClick={handleToggleAllArticleTypes}
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
                  onChange={handleArticleTypeChange}
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
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, includeArxiv: e.target.checked }))
                }
                label={t('inputForm.sources.arxiv')}
              />
              {formData.includeArxiv && (
                <p className="text-[11px] text-text-secondary pl-2 leading-relaxed">
                  {t('inputForm.sources.arxiv_hint')}
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
              onChange={handleChange}
              min={10}
              max={200}
              step={10}
            />
            <SliderInput
              label={t('inputForm.workload.top_n')}
              id="topNToSynthesize"
              value={formData.topNToSynthesize}
              onChange={handleChange}
              min={1}
              max={20}
            />
            {errors.topN && (
              <p className="text-xs text-red-400 font-medium bg-red-500/10 border border-red-500/20 p-2 rounded-md text-center">
                {errors.topN}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || hasErrors}
            className="w-full inline-flex justify-center items-center py-3.5 px-4 border border-transparent shadow-lg shadow-brand-accent/20 text-base font-bold rounded-lg text-brand-text-on-accent bg-gradient-to-r from-brand-primary to-accent-cyan hover:shadow-glow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-brand-accent disabled:from-border disabled:to-border disabled:text-text-secondary disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99]"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span className="tracking-wide">{t('inputForm.submit.loading')}</span>
              </>
            ) : (
              <>
                <SearchIcon className="h-5 w-5 mr-2" />
                {t('inputForm.submit')}
              </>
            )}
          </button>
        </form>
      </div>
      {isPresetModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm animate-fadeIn"
          style={{ animationDuration: '150ms' }}
        >
          <div
            ref={modalRef}
            className="glass-panel rounded-xl p-6 w-full max-w-sm m-4 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="save-preset-modal-title"
          >
            <h3 id="save-preset-modal-title" className="text-lg font-bold brand-gradient-text">
              {t('preset.save_title')}
            </h3>
            <div className="mt-4">
              <label
                htmlFor="presetName"
                className="block text-sm font-medium text-text-primary mb-1"
              >
                {t('preset.name_label')}
              </label>
              <input
                type="text"
                id="presetName"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                className="glass-input block w-full rounded-lg shadow-sm py-2 px-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-accent sm:text-sm"
                placeholder={t('preset.name_placeholder')}
                // eslint-disable-next-line jsx-a11y/no-autofocus -- this is the sole input of a focus-trapped modal (useFocusTrap above); focusing it on open is expected, not page-load autofocus.
                autoFocus
              />
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={closePresetModal}
                className="px-4 py-2 border border-border text-sm font-medium rounded-lg shadow-sm text-text-primary bg-surface hover:bg-surface-hover transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSavePreset}
                disabled={!newPresetName.trim()}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-brand-accent hover:bg-opacity-90 disabled:opacity-50 transition-colors"
              >
                {t('preset.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const InputForm = memo(InputFormComponent);
