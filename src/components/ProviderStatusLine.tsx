import React from 'react';
import { useInferenceMode } from '../hooks/useInferenceMode';
import { useTranslation } from '../hooks/useTranslation';
import { useSettings } from '../contexts/SettingsContext';
import type { View } from '../types/ui';
import type { TranslationKey } from '../i18n/translations';
import type { AIProviderSelection } from '../services/providers/types';

const PROVIDER_LABEL_KEYS: Record<AIProviderSelection, TranslationKey> = {
  gemini: 'settings.ai.provider_label.gemini',
  openai: 'settings.ai.provider_label.openai',
  anthropic: 'settings.ai.provider_label.anthropic',
  ollama: 'settings.ai.provider_label.ollama',
  heuristic: 'settings.ai.provider_label.heuristic',
};

interface ProviderStatusLineProps {
  onConfigure?: (view: View) => void;
}

/**
 * Compact AI-source line for Orchestrator / Quick research (NOW-P1-SETTINGS-01).
 */
export const ProviderStatusLine: React.FC<ProviderStatusLineProps> = ({ onConfigure }) => {
  const { mode, reason, provider } = useInferenceMode();
  const { settings } = useSettings();
  const { t } = useTranslation();

  const label =
    reason === 'force'
      ? t('provider.status.forced')
      : reason === 'offline'
        ? t('provider.status.offline')
        : mode === 'live'
          ? provider === 'ollama'
            ? t('provider.status.ollama', { model: settings.ai.model || 'local' })
            : t('provider.status.live', {
                provider: t(PROVIDER_LABEL_KEYS[provider] ?? 'settings.ai.provider_label.gemini'),
              })
          : t('provider.status.heuristic');

  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-secondary">
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
  );
};
