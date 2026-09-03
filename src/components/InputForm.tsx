import React, { useState, useEffect, useRef, memo } from 'react';
import type { ResearchInput, Settings } from '../types';
import { ARTICLE_TYPES } from '../types';
import { usePresets } from '../contexts/PresetContext';
import { SearchIcon } from './icons/SearchIcon';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { InputFormHeader } from './InputFormHeader';
import { InputFormOptions } from './InputFormOptions';
import { ProviderStatusLine } from './ProviderStatusLine';
import { useTranslation } from '../hooks/useTranslation';
import { useUI } from '../contexts/UIContext';
import { safeLogError } from '../lib/safeLog';

interface InputFormProps {
  onSubmit: (data: ResearchInput) => void;
  isLoading: boolean;
  defaultSettings: Settings['defaults'];
  prefilledTopic: string | null;
  onPrefillConsumed: () => void;
}

const FORM_STATE_KEY = 'aiResearchFormState';
const OPTIONS_OPEN_KEY = 'aiResearchFormOptionsOpen';
const TOPN_ERROR_ID = 'input-form-topn-error';

const SAMPLE_CHIP_KEYS = [
  'inputForm.chip.covid',
  'inputForm.chip.glp1',
  'inputForm.chip.sleep',
] as const;

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
        const parsed = JSON.parse(savedState) as Partial<ResearchInput>;
        return {
          researchTopic: typeof parsed.researchTopic === 'string' ? parsed.researchTopic : '',
          dateRange: parsed.dateRange ?? defaultSettings.defaultDateRange,
          articleTypes: Array.isArray(parsed.articleTypes)
            ? parsed.articleTypes
            : [...defaultSettings.defaultArticleTypes],
          synthesisFocus: parsed.synthesisFocus ?? defaultSettings.defaultSynthesisFocus,
          maxArticlesToScan: parsed.maxArticlesToScan ?? defaultSettings.maxArticlesToScan,
          topNToSynthesize: parsed.topNToSynthesize ?? defaultSettings.topNToSynthesize,
          includeArxiv: Boolean(parsed.includeArxiv),
          educationalDemoMode: Boolean(parsed.educationalDemoMode),
        };
      }
    } catch (e) {
      safeLogError('Could not parse form state from sessionStorage', e);
    }
    return {
      researchTopic: '',
      dateRange: defaultSettings.defaultDateRange,
      articleTypes: [...defaultSettings.defaultArticleTypes],
      synthesisFocus: defaultSettings.defaultSynthesisFocus,
      maxArticlesToScan: defaultSettings.maxArticlesToScan,
      topNToSynthesize: defaultSettings.topNToSynthesize,
      includeArxiv: false,
      educationalDemoMode: false,
    };
  });
  const [optionsOpen, setOptionsOpen] = useState(() => {
    try {
      if (sessionStorage.getItem(OPTIONS_OPEN_KEY) === '1') return true;
    } catch {
      return false;
    }
    try {
      const savedState = sessionStorage.getItem(FORM_STATE_KEY);
      if (!savedState) return false;
      const parsed = JSON.parse(savedState) as Partial<ResearchInput>;
      return (
        typeof parsed.topNToSynthesize === 'number' &&
        typeof parsed.maxArticlesToScan === 'number' &&
        parsed.topNToSynthesize > parsed.maxArticlesToScan
      );
    } catch {
      return false;
    }
  });
  const { t } = useTranslation();
  const { requestViewChange } = useUI();
  const topicRef = useRef<HTMLTextAreaElement>(null);
  const topicBlank = !formData.researchTopic.trim();
  const errors: { topN?: string; topic?: string } = {
    ...(formData.topNToSynthesize > formData.maxArticlesToScan
      ? { topN: t('orchestrator.error.topn_exceeds_max') }
      : {}),
    ...(formData.researchTopic.length > 0 && topicBlank
      ? { topic: t('inputForm.error.topic_required') }
      : {}),
  };
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
      safeLogError('Could not save form state to sessionStorage', e);
    }
  }, [formData]);

  useEffect(() => {
    try {
      sessionStorage.setItem(OPTIONS_OPEN_KEY, optionsOpen ? '1' : '0');
    } catch {
      /* ignore quota */
    }
  }, [optionsOpen]);

  useEffect(() => {
    topicRef.current?.setCustomValidity(topicBlank ? t('inputForm.error.topic_required') : '');
  }, [topicBlank, t]);

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
      const currentTypes = prev.articleTypes ?? [];
      if (checked) {
        return { ...prev, articleTypes: [...currentTypes, value] };
      }
      return { ...prev, articleTypes: currentTypes.filter((type) => type !== value) };
    });
  };

  const submitIfValid = () => {
    if (Object.keys(errors).length === 0 && !isLoading && formData.researchTopic.trim()) {
      onSubmit(formData);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitIfValid();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      e.currentTarget.requestSubmit();
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

  return (
    <>
      <div className="glass-panel rounded-xl p-6 sm:p-8 transition-all duration-300 hover:shadow-lg">
        <InputFormHeader
          presets={presets}
          onLoadPreset={handleLoadPreset}
          onOpenPresetModal={() => setIsPresetModalOpen(true)}
        />
        <ProviderStatusLine onConfigure={requestViewChange} />
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Ctrl/Cmd+Enter form-wide submit shortcut; the form already contains real interactive child controls (inputs, buttons). */}
        <form
          onSubmit={handleSubmit}
          onKeyDown={handleKeyDown}
          className="space-y-6 mt-4"
          role="search"
        >
          <div className="group">
            <label
              htmlFor="researchTopic"
              className="block text-sm font-semibold text-text-primary mb-2"
            >
              {t('inputForm.topic.label')}
            </label>
            <textarea
              ref={topicRef}
              id="researchTopic"
              name="researchTopic"
              rows={3}
              value={formData.researchTopic}
              onChange={handleChange}
              className="glass-input block w-full rounded-lg shadow-inner py-3 px-4 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-brand-accent transition-all text-base"
              required
              aria-invalid={Boolean(errors.topic) || undefined}
              aria-describedby={errors.topic ? 'input-form-topic-error' : undefined}
              placeholder={t('inputForm.topic.placeholder')}
            />
            {errors.topic && (
              <p
                id="input-form-topic-error"
                role="alert"
                className="mt-2 text-xs text-red-400 font-medium bg-red-500/10 border border-red-500/20 p-2 rounded-md"
              >
                {errors.topic}
              </p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              {SAMPLE_CHIP_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, researchTopic: t(key) }))}
                  className="px-3 py-1.5 text-xs font-medium rounded-full border border-border bg-surface/60 text-text-secondary hover:text-text-primary hover:border-brand-accent/50 focus-ring-aa"
                >
                  {t(key)}
                </button>
              ))}
            </div>
          </div>

          <details
            className="rounded-xl border border-border bg-surface/20"
            open={optionsOpen}
            onToggle={(e) => setOptionsOpen(e.currentTarget.open)}
          >
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-text-primary focus-ring-aa rounded-xl">
              {t('inputForm.options')}
              <span className="ml-2 font-normal text-text-secondary">
                {t('inputForm.options.hint')}
              </span>
            </summary>
            <div className="px-4 pb-5">
              <InputFormOptions
                formData={formData}
                errors={errors}
                topNErrorId={TOPN_ERROR_ID}
                allArticleTypesSelected={allArticleTypesSelected}
                onChange={handleChange}
                onArticleTypeChange={handleArticleTypeChange}
                onToggleAllArticleTypes={() =>
                  setFormData((prev) => ({
                    ...prev,
                    articleTypes: allArticleTypesSelected ? [] : [...ARTICLE_TYPES],
                  }))
                }
                onToggleArxiv={(checked) =>
                  setFormData((prev) => ({ ...prev, includeArxiv: checked }))
                }
                onToggleDemo={(checked) =>
                  setFormData((prev) => ({ ...prev, educationalDemoMode: checked }))
                }
              />
            </div>
          </details>

          {errors.topN && (
            <p
              id={TOPN_ERROR_ID}
              role="alert"
              className="text-xs text-red-400 font-medium bg-red-500/10 border border-red-500/20 p-2 rounded-md text-center"
            >
              {errors.topN}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading || hasErrors || topicBlank}
            className="w-full inline-flex justify-center items-center py-3.5 px-4 border border-transparent shadow-lg shadow-brand-accent/20 text-base font-bold rounded-lg text-brand-text-on-accent bg-gradient-to-r from-brand-primary to-accent-cyan hover:shadow-glow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-brand-accent disabled:from-border disabled:to-border disabled:text-text-secondary disabled:cursor-not-allowed transition-all duration-300 motion-reduce:hover:scale-100 hover:scale-[1.01] active:scale-[0.99]"
          >
            {isLoading ? (
              <span className="tracking-wide">{t('inputForm.submit.loading')}</span>
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
