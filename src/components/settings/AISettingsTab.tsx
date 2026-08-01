import React from 'react';
import { useSettingsView } from './SettingsViewContext';
import { ApiKeySettings } from './ApiKeySettings';
import { CostEstimateCard } from './CostEstimateCard';
import { SettingCard } from '../SettingCard';
import { Toggle } from '../Toggle';
import { Tooltip } from '../Tooltip';
import { InfoIcon } from '../icons/InfoIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { ARTICLE_TYPES } from '../../types';
import type { Settings } from '../../types';
import { InferenceModeSettings, useApiKeyInferenceRefresh } from './InferenceModeSettings';
import { AI_PROVIDERS, getProviderMeta } from '../../services/providers/provider';
import type { AIProviderSelection } from '../../services/providers/types';
import { isNonAiAvailable } from '../../services/nonAi';
import type { TranslationKey } from '../../i18n/translations';

type AiPersona = Settings['ai']['aiPersona'];

const PERSONA_KEYS: {
  value: AiPersona;
  label: TranslationKey;
  desc: TranslationKey;
}[] = [
  {
    value: 'Neutral Scientist',
    label: 'settings.ai.persona.neutral',
    desc: 'settings.ai.persona.neutral_desc',
  },
  {
    value: 'Concise Expert',
    label: 'settings.ai.persona.concise',
    desc: 'settings.ai.persona.concise_desc',
  },
  {
    value: 'Detailed Analyst',
    label: 'settings.ai.persona.detailed',
    desc: 'settings.ai.persona.detailed_desc',
  },
  {
    value: 'Creative Synthesizer',
    label: 'settings.ai.persona.creative',
    desc: 'settings.ai.persona.creative_desc',
  },
];

const ARTICLE_TYPE_LABEL_KEYS: Record<(typeof ARTICLE_TYPES)[number], TranslationKey> = {
  'Randomized Controlled Trial': 'inputForm.articleType.rct',
  'Meta-Analysis': 'inputForm.articleType.meta',
  'Systematic Review': 'inputForm.articleType.systematic',
  'Observational Study': 'inputForm.articleType.observational',
};

const ProviderFields: React.FC = () => {
  const { tempSettings, setTempSettings, t } = useSettingsView();
  const currentProvider = tempSettings.ai.provider ?? 'gemini';
  const providerMeta = getProviderMeta(currentProvider);

  const handleProviderChange = (provider: AIProviderSelection) => {
    const meta = getProviderMeta(provider);
    setTempSettings((s) => ({
      ...s,
      ai: {
        ...s.ai,
        provider,
        model: meta.defaultModel,
        customBaseUrl:
          provider === 'ollama'
            ? (meta.defaultBaseUrl ?? '')
            : provider === 'openai' || provider === 'anthropic'
              ? (meta.defaultBaseUrl ?? '')
              : '',
      },
    }));
  };

  return (
    <>
      <div>
        <label htmlFor="ai-provider" className="font-medium text-text-primary">
          {t('settings.ai.provider')}
        </label>
        <select
          id="ai-provider"
          value={currentProvider}
          onChange={(e) => handleProviderChange(e.target.value as AIProviderSelection)}
          className="mt-1 block w-full bg-input-bg border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent"
        >
          {Object.values(AI_PROVIDERS).map((meta) => (
            <option key={meta.id} value={meta.id}>
              {meta.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-text-secondary mt-1">{t('settings.ai.provider_desc')}</p>
        {currentProvider === 'heuristic' && (
          <p className="text-xs text-text-secondary mt-1">
            {isNonAiAvailable()
              ? t('settings.ai.nonai_available_desc')
              : t('settings.ai.nonai_unavailable_desc')}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="ai-model" className="font-medium text-text-primary">
          {t('settings.ai.model')}
        </label>
        <input
          id="ai-model"
          type="text"
          list="ai-model-suggestions"
          value={tempSettings.ai.model}
          onChange={(e) =>
            setTempSettings((s) => ({ ...s, ai: { ...s.ai, model: e.target.value } }))
          }
          placeholder={providerMeta.defaultModel}
          className="mt-1 block w-full bg-input-bg border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent"
        />
        <datalist id="ai-model-suggestions">
          {providerMeta.modelSuggestions.map((model) => (
            <option key={model} value={model} />
          ))}
        </datalist>
        <p className="text-xs text-text-secondary mt-1">
          {t('settings.ai.model_desc', { provider: providerMeta.label })}
        </p>
      </div>

      {providerMeta.supportsBaseUrl && (
        <div>
          <label htmlFor="ai-base-url" className="font-medium text-text-primary">
            {t('settings.ai.base_url')}
          </label>
          <input
            id="ai-base-url"
            type="url"
            value={tempSettings.ai.customBaseUrl ?? ''}
            onChange={(e) =>
              setTempSettings((s) => ({
                ...s,
                ai: { ...s.ai, customBaseUrl: e.target.value },
              }))
            }
            placeholder={providerMeta.defaultBaseUrl}
            className="mt-1 block w-full bg-input-bg border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent"
          />
          <p className="text-xs text-text-secondary mt-1">{t('settings.ai.base_url_desc')}</p>
        </div>
      )}
    </>
  );
};

const PersonaPicker: React.FC = () => {
  const { tempSettings, setTempSettings, t } = useSettingsView();
  return (
    <div>
      <span className="font-medium text-text-primary block">{t('settings.ai.persona')}</span>
      <fieldset className="mt-2">
        <legend className="sr-only">{t('settings.ai.persona')}</legend>
        <div className="space-y-2">
          {PERSONA_KEYS.map(({ value, label, desc }) => (
            // eslint-disable-next-line jsx-a11y/label-has-associated-control -- wraps its radio input; rule can't statically verify dynamic JSX text.
            <label
              key={value}
              className="flex items-start p-3 rounded-md border has-[:checked]:border-brand-accent has-[:checked]:bg-brand-accent/10 transition-colors cursor-pointer dark:border-border dark:has-[:checked]:border-brand-accent"
            >
              <input
                type="radio"
                name="ai-persona"
                value={value}
                checked={tempSettings.ai.aiPersona === value}
                onChange={() =>
                  setTempSettings((s) => ({
                    ...s,
                    ai: { ...s.ai, aiPersona: value },
                  }))
                }
                className="h-4 w-4 mt-0.5 text-brand-accent focus:ring-brand-accent border-border bg-input-bg"
              />
              <span className="ml-3 text-sm">
                <span className="font-medium text-text-primary block">{t(label)}</span>
                <span className="text-text-secondary">{t(desc)}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
};

const TemperatureControl: React.FC = () => {
  const { tempSettings, setTempSettings, t } = useSettingsView();
  return (
    <div>
      <div className="flex items-center gap-2">
        <label htmlFor="ai-temperature" className="font-medium text-text-primary">
          {t('settings.ai.temperature')}
        </label>
        <Tooltip
          content={t('settings.ai.temperature_tooltip')}
          detailedContent={
            <>
              <p className="font-bold mb-1 text-text-primary">
                {t('settings.ai.temperature_protip')}
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>{t('settings.ai.temperature_tip_low')}</li>
                <li>{t('settings.ai.temperature_tip_mid')}</li>
                <li>{t('settings.ai.temperature_tip_high')}</li>
              </ul>
            </>
          }
        >
          <InfoIcon className="h-4 w-4 text-text-secondary cursor-help" />
        </Tooltip>
      </div>
      <div className="flex items-center mt-2">
        <input
          id="ai-temperature"
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={tempSettings.ai.temperature}
          onChange={(e) =>
            setTempSettings((s) => ({
              ...s,
              ai: { ...s.ai, temperature: parseFloat(e.target.value) },
            }))
          }
          className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer"
        />
        <span className="ml-4 font-mono text-sm text-text-primary bg-input-bg border border-border rounded-md px-2 py-1 w-16 text-center">
          {tempSettings.ai.temperature.toFixed(1)}
        </span>
      </div>
    </div>
  );
};

const LanguageAndPreamble: React.FC = () => {
  const { tempSettings, setTempSettings, t } = useSettingsView();
  return (
    <>
      <div>
        <label htmlFor="ai-language" className="font-medium text-text-primary">
          {t('settings.ai.output_language')}
        </label>
        <select
          id="ai-language"
          value={tempSettings.ai.aiLanguage}
          onChange={(e) =>
            setTempSettings((s) => ({
              ...s,
              ai: { ...s.ai, aiLanguage: e.target.value as Settings['ai']['aiLanguage'] },
            }))
          }
          className="mt-1 block w-full bg-input-bg border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent"
        >
          <option value="English">{t('settings.ai.lang.english')}</option>
          <option value="German">{t('settings.ai.lang.german')}</option>
          <option value="French">{t('settings.ai.lang.french')}</option>
          <option value="Spanish">{t('settings.ai.lang.spanish')}</option>
        </select>
        <p className="text-xs text-text-secondary mt-1">{t('settings.ai.output_language_desc')}</p>
      </div>

      <div>
        <div className="flex items-center gap-2">
          <label htmlFor="custom-preamble" className="font-medium text-text-primary">
            {t('settings.ai.preamble')}
          </label>
          <Tooltip content={t('settings.ai.preamble_tooltip')}>
            <InfoIcon className="h-4 w-4 text-text-secondary cursor-help" />
          </Tooltip>
        </div>
        <textarea
          id="custom-preamble"
          rows={3}
          value={tempSettings.ai.customPreamble}
          onChange={(e) =>
            setTempSettings((s) => ({ ...s, ai: { ...s.ai, customPreamble: e.target.value } }))
          }
          className="mt-1 block w-full bg-input-bg border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent"
          placeholder={t('settings.ai.preamble_placeholder')}
        ></textarea>
      </div>
    </>
  );
};

const AiConfigurationCard: React.FC = () => {
  const { tempSettings, setTempSettings, t } = useSettingsView();
  return (
    <SettingCard
      icon={<SparklesIcon className="w-6 h-6 text-accent-magenta" />}
      title={t('settings.ai')}
      description={t('settings.ai.desc')}
    >
      <div className="space-y-6">
        <ProviderFields />
        <PersonaPicker />
        <TemperatureControl />
        <LanguageAndPreamble />
        <div className="pt-6 border-t border-border">
          <Toggle
            checked={tempSettings.ai.enableTldr}
            onChange={(checked) =>
              setTempSettings((s) => ({ ...s, ai: { ...s.ai, enableTldr: checked } }))
            }
          >
            {t('settings.ai.enable_tldr')}
          </Toggle>
          <p className="text-xs text-text-secondary mt-2">{t('settings.ai.tldr_desc')}</p>
        </div>
        <InferenceModeSettings />
      </div>
    </SettingCard>
  );
};

const ResearchHubCard: React.FC = () => {
  const { tempSettings, setTempSettings, t } = useSettingsView();
  const ra = tempSettings.ai.researchAssistant;
  const setRa = (patch: Partial<Settings['ai']['researchAssistant']>) =>
    setTempSettings((s) => ({
      ...s,
      ai: { ...s.ai, researchAssistant: { ...s.ai.researchAssistant, ...patch } },
    }));

  return (
    <SettingCard title={t('settings.ai.hub.title')} description={t('settings.ai.hub.desc')}>
      <div className="space-y-4">
        <Toggle checked={ra.autoFetchSimilar} onChange={(c) => setRa({ autoFetchSimilar: c })}>
          {t('settings.ai.hub.auto_similar')}
        </Toggle>
        <Toggle checked={ra.autoFetchOnline} onChange={(c) => setRa({ autoFetchOnline: c })}>
          {t('settings.ai.hub.auto_online')}
        </Toggle>
        <div className="pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <label htmlFor="author-search-limit" className="font-medium text-text-primary">
              {t('settings.ai.hub.author_limit')}
            </label>
            <Tooltip content={t('settings.ai.hub.author_limit_tooltip')}>
              <InfoIcon className="h-4 w-4 text-text-secondary cursor-help" />
            </Tooltip>
          </div>
          <div className="flex items-center mt-2">
            <input
              id="author-search-limit"
              type="range"
              min="50"
              max="500"
              step="50"
              value={ra.authorSearchLimit}
              onChange={(e) => setRa({ authorSearchLimit: parseInt(e.target.value) })}
              className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer"
            />
            <span className="ml-4 font-mono text-sm text-text-primary bg-input-bg border border-border rounded-md px-2 py-1 w-16 text-center">
              {ra.authorSearchLimit}
            </span>
          </div>
        </div>
      </div>
    </SettingCard>
  );
};

const FormDefaultsCard: React.FC = () => {
  const { tempSettings, setTempSettings, errors, t } = useSettingsView();

  const handleArticleTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setTempSettings((prev) => {
      const currentTypes = prev.defaults.defaultArticleTypes;
      const newTypes = checked
        ? [...currentTypes, value]
        : currentTypes.filter((type) => type !== value);
      return { ...prev, defaults: { ...prev.defaults, defaultArticleTypes: newTypes } };
    });
  };

  const inputClass = (hasError: boolean) =>
    `block w-full bg-input-bg border rounded-md shadow-sm py-2 px-3 focus:outline-none focus-visible:ring-2 sm:text-sm ${hasError ? 'border-red-500 focus-visible:ring-red-500' : 'border-border focus-visible:ring-brand-accent'}`;

  return (
    <SettingCard
      title={t('settings.ai.formDefaults.title')}
      description={t('settings.ai.formDefaults.desc')}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="def-max-scan"
              className="block text-sm font-medium text-text-primary mb-1"
            >
              {t('settings.ai.formDefaults.max_scan')}
            </label>
            <input
              type="number"
              id="def-max-scan"
              min="10"
              max="200"
              value={tempSettings.defaults.maxArticlesToScan}
              onChange={(e) =>
                setTempSettings((s) => ({
                  ...s,
                  defaults: { ...s.defaults, maxArticlesToScan: parseInt(e.target.value, 10) },
                }))
              }
              className={inputClass(Boolean(errors.formDefaults))}
            />
          </div>
          <div>
            <label
              htmlFor="def-top-synth"
              className="block text-sm font-medium text-text-primary mb-1"
            >
              {t('settings.ai.formDefaults.top_synth')}
            </label>
            <input
              type="number"
              id="def-top-synth"
              min="1"
              max="20"
              value={tempSettings.defaults.topNToSynthesize}
              onChange={(e) =>
                setTempSettings((s) => ({
                  ...s,
                  defaults: { ...s.defaults, topNToSynthesize: parseInt(e.target.value, 10) },
                }))
              }
              className={inputClass(Boolean(errors.formDefaults))}
            />
          </div>
          <div>
            <label
              htmlFor="def-date-range"
              className="block text-sm font-medium text-text-primary mb-1"
            >
              {t('settings.ai.formDefaults.date')}
            </label>
            <select
              id="def-date-range"
              value={tempSettings.defaults.defaultDateRange}
              onChange={(e) =>
                setTempSettings((s) => ({
                  ...s,
                  defaults: { ...s.defaults, defaultDateRange: e.target.value },
                }))
              }
              className="block w-full bg-input-bg border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent"
            >
              <option value="any">{t('inputForm.date.any')}</option>
              <option value="1">{t('inputForm.date.year1')}</option>
              <option value="5">{t('inputForm.date.year5')}</option>
              <option value="10">{t('inputForm.date.year10')}</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="def-synthesis-focus"
              className="block text-sm font-medium text-text-primary mb-1"
            >
              {t('settings.ai.formDefaults.focus')}
            </label>
            <select
              id="def-synthesis-focus"
              value={tempSettings.defaults.defaultSynthesisFocus}
              onChange={(e) =>
                setTempSettings((s) => ({
                  ...s,
                  defaults: { ...s.defaults, defaultSynthesisFocus: e.target.value },
                }))
              }
              className="block w-full bg-input-bg border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent"
            >
              <option value="overview">{t('orchestrator.focus.overview')}</option>
              <option value="clinical">{t('orchestrator.focus.clinical')}</option>
              <option value="future">{t('orchestrator.focus.future')}</option>
              <option value="gaps">{t('orchestrator.focus.gaps')}</option>
            </select>
          </div>
        </div>
        {errors.formDefaults && <p className="text-xs text-red-400 mt-2">{errors.formDefaults}</p>}
        <fieldset className="pt-6 border-t border-border">
          <legend className="text-sm font-medium text-text-primary mb-2">
            {t('settings.ai.formDefaults.article_types')}
          </legend>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {ARTICLE_TYPES.map((type) => (
              <div key={type} className="relative flex items-start">
                <div className="flex h-5 items-center">
                  <input
                    id={`def-${type}`}
                    value={type}
                    type="checkbox"
                    checked={tempSettings.defaults.defaultArticleTypes.includes(type)}
                    onChange={handleArticleTypeChange}
                    className="h-4 w-4 rounded border-border bg-input-bg text-brand-accent focus:ring-brand-accent"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor={`def-${type}`} className="font-medium text-text-primary">
                    {t(ARTICLE_TYPE_LABEL_KEYS[type])}
                  </label>
                </div>
              </div>
            ))}
          </div>
        </fieldset>
        <div className="pt-6 border-t border-border">
          <Toggle
            checked={tempSettings.defaults.autoSaveReports}
            onChange={(checked) =>
              setTempSettings((s) => ({
                ...s,
                defaults: { ...s.defaults, autoSaveReports: checked },
              }))
            }
          >
            {t('settings.ai.formDefaults.auto_save')}
          </Toggle>
        </div>
      </div>
    </SettingCard>
  );
};

export const AISettingsTab: React.FC = () => {
  const onApiKeyChange = useApiKeyInferenceRefresh();
  return (
    <div className="space-y-8">
      <ApiKeySettings onKeyChange={onApiKeyChange} />
      <CostEstimateCard />
      <AiConfigurationCard />
      <ResearchHubCard />
      <FormDefaultsCard />
    </div>
  );
};
