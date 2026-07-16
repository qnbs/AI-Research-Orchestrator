import React, { useState, useEffect } from 'react';
import {
  saveApiKey,
  getApiKey,
  removeApiKey,
  hasApiKey,
  validateApiKeyFormat,
  saveNcbiApiKey,
  getNcbiApiKey,
  removeNcbiApiKey,
} from '../../services/apiKeyService';
import { ShieldCheckIcon } from '../icons/ShieldCheckIcon';
import { ExclamationTriangleIcon } from '../icons/ExclamationTriangleIcon';
import { EyeIcon } from '../icons/EyeIcon';
import { EyeSlashIcon } from '../icons/EyeSlashIcon';
import { KeyIcon } from '../icons/KeyIcon';

interface ApiKeySettingsProps {
  onKeyChange?: (hasKey: boolean) => void;
}

export const ApiKeySettings: React.FC<ApiKeySettingsProps> = ({ onKeyChange }) => {
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

  useEffect(() => {
    void checkStoredKey();
  }, []);

  const checkStoredKey = async () => {
    setIsLoading(true);
    try {
      const [stored, storedNcbiKey] = await Promise.all([hasApiKey(), getNcbiApiKey()]);
      setHasStoredKey(stored);
      setHasStoredNcbiKey(!!storedNcbiKey);
      setNcbiApiKey(storedNcbiKey ?? '');
      onKeyChange?.(stored);
    } catch (err) {
      console.error('Error checking API key:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(null);

    if (!apiKey.trim()) {
      setError('Please enter an API key.');
      return;
    }

    if (!validateApiKeyFormat(apiKey.trim())) {
      setError(
        'Invalid API key format. Gemini API keys start with "AIza" and are 39 characters long.',
      );
      return;
    }

    setIsSaving(true);
    try {
      await saveApiKey(apiKey.trim());
      setHasStoredKey(true);
      setApiKey('');
      setSuccess('API key saved securely in this browser.');
      onKeyChange?.(true);
    } catch (err) {
      setError('Failed to save the API key.');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    setIsSaving(true);
    try {
      await removeApiKey();
      setHasStoredKey(false);
      setSuccess('API key removed.');
      onKeyChange?.(false);
    } catch (err) {
      setError('Failed to remove the API key.');
      console.error(err);
    } finally {
      setIsSaving(false);
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
      setNcbiSuccess(
        trimmed.length > 0
          ? 'NCBI API key saved securely in this browser.'
          : 'NCBI API key removed.',
      );
    } catch (err) {
      setNcbiError('Failed to save the NCBI API key.');
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
      setNcbiSuccess('NCBI API key removed.');
    } catch (err) {
      setNcbiError('Failed to remove the NCBI API key.');
      console.error(err);
    } finally {
      setIsNcbiSaving(false);
    }
  };

  const handleShowCurrentKey = async () => {
    try {
      const key = await getApiKey();
      if (key) {
        setApiKey(key);
        setShowKey(true);
      }
    } catch (err) {
      setError('Failed to retrieve the API key.');
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

  return (
    <div className="space-y-6">
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-amber-500 mb-1">Security notice</p>
            <p className="text-text-secondary">
              Your Gemini API key is <strong>encrypted</strong> and stored in this browser only. It
              is never sent to our servers. Requests go directly from your browser to the Google
              Gemini API.
            </p>
            <p className="text-text-secondary mt-2">
              <strong>Recommendation:</strong> Restrict the key in the{' '}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-accent hover:underline"
              >
                Google AI Studio Console
              </a>{' '}
              for additional safety.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-surface-hover/30">
        {hasStoredKey ? (
          <>
            <ShieldCheckIcon className="h-6 w-6 text-green-500" />
            <div className="flex-1">
              <p className="font-medium text-text-primary">Gemini API key configured</p>
              <p className="text-sm text-text-secondary">
                Your key is stored securely and ready for AI features.
              </p>
            </div>
            <button
              onClick={handleShowCurrentKey}
              className="text-sm text-brand-accent hover:underline"
            >
              Reveal
            </button>
          </>
        ) : (
          <>
            <KeyIcon className="h-6 w-6 text-text-secondary" />
            <div className="flex-1">
              <p className="font-medium text-text-primary">No Gemini API key configured</p>
              <p className="text-sm text-text-secondary">
                Enter your{' '}
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-accent hover:underline"
                >
                  Gemini API key
                </a>{' '}
                to enable AI research features.
              </p>
            </div>
          </>
        )}
      </div>

      <div className="space-y-3">
        <label htmlFor="api-key-input" className="block font-medium text-text-primary">
          {hasStoredKey ? 'Update Gemini API key' : 'Enter Gemini API key'}
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
            placeholder="AIza..."
            className="w-full bg-input-bg border border-border rounded-lg px-4 py-3 pr-20 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent font-mono"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-text-secondary hover:text-text-primary transition-colors"
            aria-label={showKey ? 'Hide key' : 'Show key'}
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
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          {hasStoredKey && (
            <button
              onClick={handleRemove}
              disabled={isSaving}
              className="px-4 py-2.5 bg-red-500/10 text-red-400 border border-red-500/30 font-medium rounded-lg hover:bg-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3 border-t border-border pt-4">
        <label htmlFor="ncbi-api-key" className="block font-medium text-text-primary">
          Optional NCBI API key
        </label>
        <p className="text-sm text-text-secondary">
          Improves PubMed/NCBI rate limits. Stored encrypted in the same browser vault pattern as
          the Gemini key, never in general app settings. Get a key at{' '}
          <a
            href="https://www.ncbi.nlm.nih.gov/account/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-accent hover:underline"
          >
            NCBI Account
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
            {hasStoredNcbiKey ? 'NCBI API key configured.' : 'No NCBI API key configured.'}
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
            placeholder="NCBI API key (optional)"
            className="w-full bg-input-bg border border-border rounded-lg px-4 py-3 pr-20 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent font-mono"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={() => setShowNcbiKey(!showNcbiKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-text-secondary hover:text-text-primary transition-colors"
            aria-label={showNcbiKey ? 'Hide NCBI key' : 'Show NCBI key'}
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
            {isNcbiSaving ? 'Saving...' : 'Save NCBI key'}
          </button>
          {hasStoredNcbiKey && (
            <button
              onClick={handleRemoveNcbi}
              disabled={isNcbiSaving}
              className="px-4 py-2.5 bg-red-500/10 text-red-400 border border-red-500/30 font-medium rounded-lg hover:bg-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      <div className="text-sm text-text-secondary border-t border-border pt-4 space-y-2">
        <p>
          <strong>How to get a Gemini API key:</strong>
        </p>
        <ol className="list-decimal list-inside space-y-1 ml-2">
          <li>
            Open{' '}
            <a
              href="https://aistudio.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-accent hover:underline"
            >
              Google AI Studio
            </a>
          </li>
          <li>Sign in with your Google account</li>
          <li>Choose &quot;Get API key&quot; → &quot;Create API key&quot;</li>
          <li>Paste the key here and save</li>
        </ol>
        <p className="mt-3 text-xs text-text-secondary/70">
          Gemini API usage may incur costs. Monitor usage in Google Cloud / AI Studio.
        </p>
      </div>
    </div>
  );
};

export default ApiKeySettings;
