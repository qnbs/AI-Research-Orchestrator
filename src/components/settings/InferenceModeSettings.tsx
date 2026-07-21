import React, { useCallback } from 'react';
import { Toggle } from '../Toggle';
import { useSettingsView } from './SettingsViewContext';
import { useTranslation } from '../../hooks/useTranslation';
import { useInferenceMode } from '../../hooks/useInferenceMode';

/**
 * Settings → AI block for inference mode (force heuristic + derived status).
 */
export const InferenceModeSettings: React.FC = () => {
  const { tempSettings, setTempSettings } = useSettingsView();
  const { t } = useTranslation();

  return (
    <div className="pt-6 border-t border-border space-y-3">
      <div>
        <p className="text-xs uppercase tracking-wide text-text-secondary">
          {t('settings.inference.current')}
        </p>
        <p className="mt-1 text-sm text-text-primary">
          {tempSettings.ai.forceHeuristicMode
            ? t('settings.inference.forced_preview')
            : t('settings.inference.derived')}
        </p>
      </div>
      <Toggle
        checked={Boolean(tempSettings.ai.forceHeuristicMode)}
        onChange={(checked) =>
          setTempSettings((s) => ({
            ...s,
            ai: { ...s.ai, forceHeuristicMode: checked },
          }))
        }
      >
        {t('settings.inference.force')}
      </Toggle>
      <p className="text-xs text-text-secondary">{t('settings.inference.force_desc')}</p>
    </div>
  );
};

/**
 * Notify listeners (header badge, cost card) after Gemini/NCBI key vault changes.
 */
export function notifyApiKeyChanged(refreshInferenceMode?: () => Promise<void> | void): void {
  window.dispatchEvent(new Event('aro-api-key-changed'));
  void refreshInferenceMode?.();
}

/** Hook wiring for AI settings key-change → inference mode refresh. */
export function useApiKeyInferenceRefresh(): () => void {
  const { refresh } = useInferenceMode();
  return useCallback(() => notifyApiKeyChanged(refresh), [refresh]);
}
