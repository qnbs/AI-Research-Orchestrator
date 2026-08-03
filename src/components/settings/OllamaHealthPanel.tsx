import React, { useCallback, useEffect, useState } from 'react';
import { useSettingsView } from './SettingsViewContext';
import {
  estimateOllamaInputTokenBudget,
  isOllamaModelAvailable,
  probeOllamaHealth,
  type OllamaHealthResult,
} from '../../services/providers/ollamaHealth';

function formatCheckedAt(ts: number): string {
  try {
    return new Date(ts).toLocaleTimeString();
  } catch {
    return String(ts);
  }
}

/**
 * Settings diagnostics for the Ollama / Local AI backend:
 * health probe, model discovery, model-missing warning, and privacy note.
 */
export const OllamaHealthPanel: React.FC = () => {
  const { tempSettings, setTempSettings, t } = useSettingsView();
  const [health, setHealth] = useState<OllamaHealthResult | null>(null);
  const [loading, setLoading] = useState(false);

  const baseUrl = tempSettings.ai.customBaseUrl?.trim() || 'http://localhost:11434';
  const selectedModel = tempSettings.ai.model;

  const runProbe = useCallback(
    async (force: boolean) => {
      setLoading(true);
      try {
        const result = await probeOllamaHealth(baseUrl, { force });
        setHealth(result);
      } finally {
        setLoading(false);
      }
    },
    [baseUrl],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kicks off an async health probe when the Local AI base URL changes; loading/result state is not derivable from render.
    void runProbe(false);
  }, [runProbe]);

  const modelMissing =
    health?.ok === true && selectedModel.trim().length > 0
      ? !isOllamaModelAvailable(health.models, selectedModel)
      : false;
  const budgetHint = estimateOllamaInputTokenBudget(selectedModel);

  return (
    <div
      className="rounded-md border border-border bg-input-bg/40 p-3 space-y-2"
      data-testid="ollama-health-panel"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-text-primary">
          {t('settings.ai.ollama.health_title')}
        </h3>
        <button
          type="button"
          onClick={() => void runProbe(true)}
          disabled={loading}
          className="text-xs px-2 py-1 rounded border border-border hover:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent disabled:opacity-50"
          data-testid="ollama-health-refresh"
        >
          {loading ? t('settings.ai.ollama.probing') : t('settings.ai.ollama.refresh')}
        </button>
      </div>

      <p className="text-xs text-text-secondary">{t('settings.ai.ollama.privacy_note')}</p>

      {health?.ok === true && (
        <div className="text-xs text-text-primary space-y-1" data-testid="ollama-health-ok">
          <p>
            {t('settings.ai.ollama.status_ok', {
              version: health.version,
              origin: health.origin,
            })}
          </p>
          <p className="text-text-secondary">
            {t('settings.ai.ollama.last_checked', { time: formatCheckedAt(health.checkedAt) })}
          </p>
          <div>
            <label htmlFor="ollama-discovered-model" className="font-medium">
              {t('settings.ai.ollama.models_label')}
            </label>
            {health.models.length === 0 ? (
              <p className="text-text-secondary mt-1">{t('settings.ai.ollama.models_empty')}</p>
            ) : (
              <select
                id="ollama-discovered-model"
                className="mt-1 block w-full bg-input-bg border border-border rounded-md py-1.5 px-2"
                value={health.models.some((m) => m.name === selectedModel) ? selectedModel : ''}
                onChange={(e) => {
                  const next = e.target.value;
                  if (!next) return;
                  setTempSettings((s) => ({ ...s, ai: { ...s.ai, model: next } }));
                }}
                data-testid="ollama-discovered-models"
              >
                <option value="">{t('settings.ai.ollama.models_placeholder')}</option>
                {health.models.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.parameterSize ? `${m.name} (${m.parameterSize})` : m.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}

      {health?.ok === false && (
        <p className="text-xs text-red-600 dark:text-red-400" data-testid="ollama-health-fail">
          {t('settings.ai.ollama.status_fail', {
            reason: health.reason,
            message: health.message,
          })}
        </p>
      )}

      {modelMissing && (
        <p
          className="text-xs text-amber-700 dark:text-amber-300"
          data-testid="ollama-model-missing"
        >
          {t('settings.ai.ollama.model_missing', { model: selectedModel })}
        </p>
      )}

      {budgetHint.warnTooSmall && (
        <p className="text-xs text-amber-700 dark:text-amber-300" data-testid="ollama-model-small">
          {t('settings.ai.ollama.model_small_warn', {
            model: selectedModel,
            budget: String(budgetHint.budget),
          })}
        </p>
      )}
    </div>
  );
};
