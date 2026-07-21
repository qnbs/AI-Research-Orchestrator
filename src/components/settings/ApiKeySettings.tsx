import React, { useState, useEffect, useRef } from 'react';
import {
  saveProviderApiKey,
  getProviderApiKey,
  removeProviderApiKey,
  hasProviderApiKey,
  validateApiKeyFormat,
  saveNcbiApiKey,
  getNcbiApiKey,
  removeNcbiApiKey,
  hasNcbiApiKey,
} from '../../services/apiKeyService';
import { ShieldCheckIcon } from '../icons/ShieldCheckIcon';
import { ExclamationTriangleIcon } from '../icons/ExclamationTriangleIcon';
import { EyeIcon } from '../icons/EyeIcon';
import { EyeSlashIcon } from '../icons/EyeSlashIcon';
import { KeyIcon } from '../icons/KeyIcon';
import { useTranslation } from '../../hooks/useTranslation';
import { useSettingsView } from './SettingsViewContext';
import { getProviderMeta } from '../../services/providers/provider';
import type { AIProviderSelection } from '../../services/providers/types';

interface ApiKeySettingsProps {
  onKeyChange?: (hasKey: boolean) => void;
}

export const ApiKeySettings: React.FC<ApiKeySettingsProps> = ({ onKeyChange }) => {
  const { t } = useTranslation();
  const { tempSettings } = useSettingsView();
  const provider = tempSettings.ai.provider ?? 'gemini';
  const providerMeta = getProviderMeta(provider);

  const [apiKey, setApiKey] = useState('');
  const [ncbiApiKey, setNcbiApiKey] = useState('');
  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [hasStoredNcbiKey, setHasStoredNcbiKey] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [showNcbiKey, setShowNcbiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isNcbiSaving, setIsNcbiSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [ncbiError, setNcbiError] = useState<string | null>(null);
  const [ncbiSuccess, setNcbiSuccess] = useState<string | null>(null);
  // Monotonic request counter guarding against stale async responses when the
  // provider changes rapidly. A useRef (not a property on checkStoredKey
  // itself) is required here: checkStoredKey is recreated on every render, so
  // a counter attached to the function would reset each time and never
  // actually detect staleness across renders.
  const requestIdRef = useRef(0);

  const checkStoredKey = async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    try {
      const needsKey = providerMeta.capabilities.requiresApiKey;
      const [stored, storedNcbiKey] = await Promise.all([
        needsKey && provider !== 'heuristic' ? hasProviderApiKey(provider) : Promise.resolve(false),
        getNcbiApiKey(),
      ]);
      // Guard against stale responses from previous provider selections
      if (requestIdRef.current !== requestId) return;
      setHasStoredKey(stored);
      setHasStoredNcbiKey(!!storedNcbiKey);
      setNcbiApiKey(storedNcbiKey ?? '');
      onKeyChange?.(stored);
    } catch (err) {
      // Guard against stale responses from previous provider selections
      if (requestIdRef.current === requestId) {
        console.error('Error checking API key:', err);
      }
    } finally {
      if (requestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets transient UI state (input value, visibility, messages) when the provider selection changes; not a value derivable from render.
    void checkStoredKey();
    // Clear transient UI state when the provider changes.
    setApiKey('');
    setShowKey(false);
    setError(null);
    setSuccess(null);
  }, [provider]);

  const handleSave = async () => {
    if (provider === 'heuristic' || !providerMeta.capabilities.requiresApiKey) return;
    setError(null);
    setSuccess(null);

    if (!apiKey.trim()) {
      setError(t('apikey.required'));
      return;
    }

    if (!validateApiKeyFormat(apiKey.trim(), provider)) {
      setError(t('apikey.invalid'));
      return;
    }

    setIsSaving(true);
    try {
      await saveProviderApiKey(provider, apiKey.trim());
      setHasStoredKey(true);
      setApiKey('');
      setSuccess(t('apikey.saved'));
      onKeyChange?.(true);
    } catch (err) {
      setError(t('apikey.save_failed'));
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    if (provider === 'heuristic' || !providerMeta.capabilities.requiresApiKey) return;
    setIsSaving(true);
    try {
      await removeProviderApiKey(provider);
      setHasStoredKey(false);
      setApiKey('');
      setSuccess(t('apikey.removed'));
      onKeyChange?.(false);
    } catch (err) {
      setError(t('apikey.remove_failed'));
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleShowCurrentKey = async () => {
    if (provider === 'heuristic' || !providerMeta.capabilities.requiresApiKey) return;
    try {
      const key = await getProviderApiKey(provider);
      if (key) {
        setApiKey(key);
        setShowKey(true);
      }
    } catch (err) {
      setError(t('apikey.get_failed'));
    }
  };

  const handleSaveNcbi = async () => {
    setNcbiError(null);
    setNcbiSuccess(null);
    setIsNcbiSaving(true);
    try {
      const trimmed = ncbiApiKey.trim();
      await saveNcbiApiKey(trimmed);
      setNcbiApiKey(trimmed);
      setHasStoredNcbiKey(trimmed.length > 0);
      setNcbiSuccess(trimmed.length > 0 ? t('apikey.ncbi.saved') : t('apikey.ncbi.removed'));
    } catch (err) {
      setNcbiError(t('apikey.ncbi.save_failed'));
      console.error(err);
    } finally {
      setIsNcbiSaving(false);
    }
  };

  const handleRemoveNcbi = async () => {
    setNcbiError(null);
    setNcbiSuccess(null);
    setIsNcbiSaving(true);
    try {
      await removeNcbiApiKey();
      setNcbiApiKey('');
      setHasStoredNcbiKey(false);
      setNcbiSuccess(t('apikey.ncbi.removed'));
    } catch (err) {
      setNcbiError(t('apikey.ncbi.remove_failed'));
      console.error(err);
    } finally {
      setIsNcbiSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-border rounded w-1/3"></div>
        <div className="h-10 bg-border rounded"></div>
      </div>
    );
  }

  const keyDocsUrl = providerMeta.keyDocsUrl ?? 'https://aistudio.google.com/apikey';
  const keyHint = providerMeta.keyHint ?? 'AIza...';

  return (
    <div className="space-y-6">
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-amber-500 mb-1">{t('apikey.security.title')}</p>
            <p className="text-text-secondary">
              {t('apikey.security.text_start')} <strong>{t('apikey.security.encrypted')}</strong>{' '}
              {t('apikey.security.text_end')}
            </p>
            <p className="text-text-secondary mt-2">
              <strong>{t('apikey.security.recommendation_label')}</strong>{' '}
              {t('apikey.security.recommendation_text')}{' '}
              <a
                href={keyDocsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-accent hover:underline"
              >
                {providerMeta.label} key
              </a>{' '}
              {t('apikey.security.recommendation_end')}
            </p>
          </div>
        </div>
      </div>

      {provider === 'heuristic' || !providerMeta.capabilities.requiresApiKey ? (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-surface-hover/30">
          <ShieldCheckIcon className="h-6 w-6 text-green-500" />
          <div>
            <p className="font-medium text-text-primary">{providerMeta.label}</p>
            <p className="text-sm text-text-secondary">
              {provider === 'heuristic'
                ? t('apikey.provider.heuristic_desc')
                : t('apikey.provider.local_desc')}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-surface-hover/30">
            {hasStoredKey ? (
              <>
                <ShieldCheckIcon className="h-6 w-6 text-green-500" />
                <div className="flex-1">
                  <p className="font-medium text-text-primary">
                    {t('apikey.status.provider_configured', { provider: providerMeta.label })}
                  </p>
                  <p className="text-sm text-text-secondary">{t('apikey.status.ready')}</p>
                </div>
                <button
                  onClick={handleShowCurrentKey}
                  className="text-sm text-brand-accent hover:underline"
                >
                  {t('apikey.reveal')}
                </button>
              </>
            ) : (
              <>
                <KeyIcon className="h-6 w-6 text-text-secondary" />
                <div className="flex-1">
                  <p className="font-medium text-text-primary">
                    {t('apikey.status.provider_not_configured', { provider: providerMeta.label })}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {t('apikey.status.provider_prompt_start')}{' '}
                    <a
                      href={keyDocsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-accent hover:underline"
                    >
                      {t('apikey.status.provider_prompt_link', { provider: providerMeta.label })}
                    </a>{' '}
                    {t('apikey.status.provider_prompt_end')}
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="space-y-3">
            <label htmlFor="api-key-input" className="block font-medium text-text-primary">
              {hasStoredKey
                ? t('apikey.label.provider_update', { provider: providerMeta.label })
                : t('apikey.label.provider_enter', { provider: providerMeta.label })}
            </label>
            <div className="relative">
              <input
                id="api-key-input"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setError(null);
                  setSuccess(null);
                }}
                placeholder={keyHint}
                className="w-full bg-input-bg border border-border rounded-lg px-4 py-3 pr-20 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent font-mono"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-text-secondary hover:text-text-primary transition-colors"
                aria-label={showKey ? t('apikey.hide') : t('apikey.show')}
              >
                {showKey ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
              </button>
            </div>

            {error && (
              <p className="text-sm text-red-400 flex items-center gap-2">
                <ExclamationTriangleIcon className="h-4 w-4" />
                {error}
              </p>
            )}
            {success && (
              <p className="text-sm text-green-400 flex items-center gap-2">
                <ShieldCheckIcon className="h-4 w-4" />
                {success}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={isSaving || !apiKey.trim()}
                className="flex-1 px-4 py-2.5 bg-brand-accent text-brand-text-on-accent font-medium rounded-lg hover:bg-brand-accent/90 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSaving ? t('apikey.saving') : t('apikey.save')}
              </button>
              {hasStoredKey && (
                <button
                  onClick={handleRemove}
                  disabled={isSaving}
                  className="px-4 py-2.5 bg-red-500/10 text-red-400 border border-red-500/30 font-medium rounded-lg hover:bg-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {t('apikey.remove')}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      <div className="space-y-3 border-t border-border pt-4">
        <label htmlFor="ncbi-api-key" className="block font-medium text-text-primary">
          {t('apikey.ncbi.label')}
        </label>
        <p className="text-sm text-text-secondary">
          {t('apikey.ncbi.desc')}{' '}
          <a
            href="https://www.ncbi.nlm.nih.gov/account/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-accent hover:underline"
          >
            {t('apikey.ncbi.account_link')}
          </a>
          .
        </p>
        <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-surface-hover/30">
          {hasStoredNcbiKey ? (
            <ShieldCheckIcon className="h-5 w-5 text-green-500" />
          ) : (
            <KeyIcon className="h-5 w-5 text-text-secondary" />
          )}
          <p className="text-sm text-text-secondary">
            {hasStoredNcbiKey ? t('apikey.ncbi.configured') : t('apikey.ncbi.not_configured')}
          </p>
        </div>
        <div className="relative">
          <input
            id="ncbi-api-key"
            type={showNcbiKey ? 'text' : 'password'}
            value={ncbiApiKey}
            onChange={(e) => {
              setNcbiApiKey(e.target.value);
              setNcbiError(null);
              setNcbiSuccess(null);
            }}
            placeholder={t('apikey.ncbi.placeholder')}
            className="w-full bg-input-bg border border-border rounded-lg px-4 py-3 pr-20 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent font-mono"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={() => setShowNcbiKey(!showNcbiKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-text-secondary hover:text-text-primary transition-colors"
            aria-label={showNcbiKey ? t('apikey.ncbi.hide') : t('apikey.ncbi.show')}
          >
            {showNcbiKey ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
          </button>
        </div>
        {ncbiError && (
          <p className="text-sm text-red-400 flex items-center gap-2">
            <ExclamationTriangleIcon className="h-4 w-4" />
            {ncbiError}
          </p>
        )}
        {ncbiSuccess && (
          <p className="text-sm text-green-400 flex items-center gap-2">
            <ShieldCheckIcon className="h-4 w-4" />
            {ncbiSuccess}
          </p>
        )}
        <div className="flex gap-3">
          <button
            onClick={handleSaveNcbi}
            disabled={isNcbiSaving}
            className="flex-1 px-4 py-2.5 bg-brand-accent text-brand-text-on-accent font-medium rounded-lg hover:bg-brand-accent/90 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isNcbiSaving ? t('apikey.saving') : t('apikey.ncbi.save')}
          </button>
          {hasStoredNcbiKey && (
            <button
              onClick={handleRemoveNcbi}
              disabled={isNcbiSaving}
              className="px-4 py-2.5 bg-red-500/10 text-red-400 border border-red-500/30 font-medium rounded-lg hover:bg-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {t('apikey.remove')}
            </button>
          )}
        </div>
      </div>

      <div className="text-sm text-text-secondary border-t border-border pt-4 space-y-2">
        <p>
          <strong>{t('apikey.instructions.title')}</strong>
        </p>
        <ol className="list-decimal list-inside space-y-1 ml-2">
          <li>
            {t('apikey.instructions.step1')}{' '}
            <a
              href={keyDocsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-accent hover:underline"
            >
              {providerMeta.label}
            </a>
          </li>
          <li>{t('apikey.instructions.step2')}</li>
          <li>{t('apikey.instructions.step3')}</li>
          <li>{t('apikey.instructions.step4')}</li>
        </ol>
        <p className="mt-3 text-xs text-text-secondary/70">{t('apikey.instructions.cost_note')}</p>
      </div>
    </div>
  );
};

export default ApiKeySettings;
