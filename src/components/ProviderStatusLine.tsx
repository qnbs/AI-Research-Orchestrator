import React from 'react';
import { useInferenceMode } from '../hooks/useInferenceMode';
import { useTranslation } from '../hooks/useTranslation';
import { useSettings } from '../contexts/SettingsContext';
import type { View } from '../types/ui';
import { PROVIDER_LABEL_KEYS } from '../i18n/providerLabelKeys';
import { getProviderMeta } from '../services/providers/provider';
import { isOllamaLoopbackBaseUrl } from '../lib/endpointPolicy';

interface ProviderStatusLineProps {
  onConfigure?: (view: View) => void;
}

const CLOUD_PROVIDER_IDS = ['gemini', 'openai', 'anthropic', 'heuristic'] as const;

/** Prefer a configured Ollama tag; ignore leftover cloud-provider defaults. */
export function ollamaStatusModel(configured: string | undefined): string {
  const ollama = getProviderMeta('ollama');
  const raw = configured?.trim();
  if (!raw) return ollama.defaultModel;
  const foreignDefaults = CLOUD_PROVIDER_IDS.map((id) => getProviderMeta(id).defaultModel);
  if (foreignDefaults.includes(raw)) return ollama.defaultModel;
  return raw;
}

/**
 * Compact AI-source line for Orchestrator / Quick research (NOW-P1-SETTINGS-01).
 */
export const ProviderStatusLine: React.FC<ProviderStatusLineProps> = ({ onConfigure }) => {
  const { mode, reason, provider } = useInferenceMode();
  const { settings } = useSettings();
  const { t } = useTranslation();

  const liveOllama = mode === 'live' && provider === 'ollama' && reason !== 'force';
  const ollamaLoopback = liveOllama && isOllamaLoopbackBaseUrl(settings.ai.customBaseUrl);
  const label =
    reason === 'force'
      ? t('provider.status.forced')
      : reason === 'offline'
        ? t('provider.status.offline')
        : liveOllama
          ? t('provider.status.ollama', {
              model: ollamaStatusModel(settings.ai.model),
            })
          : mode === 'live'
            ? t('provider.status.live', {
                provider: t(PROVIDER_LABEL_KEYS[provider] ?? 'settings.ai.provider_label.gemini'),
              })
            : t('provider.status.heuristic');

  return (
    <div className="space-y-1 text-xs text-text-secondary">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span>{label}</span>
        {onConfigure && (
          <button
            type="button"
            onClick={() => onConfigure('settings')}
            className="font-semibold text-brand-accent hover:text-brand-secondary focus-ring-aa rounded-sm"
          >
            {t('provider.status.configure')}
          </button>
        )}
      </p>
      {liveOllama && (
        <p data-testid="provider-status-ollama-privacy">
          {t(
            ollamaLoopback
              ? 'provider.status.ollama_privacy'
              : 'provider.status.ollama_privacy_remote',
          )}
        </p>
      )}
    </div>
  );
};
