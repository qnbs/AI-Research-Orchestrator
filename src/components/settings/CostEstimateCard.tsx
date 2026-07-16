/**
 * Pre-flight Gemini cost estimator for Settings → AI (P0-11).
 */
import React from 'react';
import { SettingCard } from '../SettingCard';
import { SparklesIcon } from '../icons/SparklesIcon';
import { useSettingsView } from './SettingsViewContext';
import { estimateResearchRunCostUsd, shouldWarnAboutResearchCost } from '../../lib/resilience';
import { useTranslation } from '../../hooks/useTranslation';

export const CostEstimateCard: React.FC = () => {
  const { tempSettings } = useSettingsView();
  const { t } = useTranslation();

  const estimate = estimateResearchRunCostUsd({
    topic: 'sample research topic for cost estimation',
    maxArticlesToScan: tempSettings.defaults.maxArticlesToScan,
    topNToSynthesize: tempSettings.defaults.topNToSynthesize,
    model: tempSettings.ai.model,
  });

  const warn = shouldWarnAboutResearchCost(estimate.estimatedUsd);

  return (
    <SettingCard
      icon={<SparklesIcon className="w-6 h-6 text-accent-amber" />}
      title={t('settings.cost.title')}
      description={t('settings.cost.desc')}
    >
      <div className="space-y-3 text-sm">
        <dl className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-surface/40 px-3 py-2">
            <dt className="text-[11px] uppercase tracking-wide text-text-secondary">
              {t('settings.cost.estimate')}
            </dt>
            <dd className="mt-1 font-mono text-lg text-text-primary">
              ${estimate.estimatedUsd.toFixed(4)}
            </dd>
          </div>
          <div className="rounded-lg border border-border bg-surface/40 px-3 py-2">
            <dt className="text-[11px] uppercase tracking-wide text-text-secondary">
              {t('settings.cost.tier')}
            </dt>
            <dd className="mt-1 font-medium text-text-primary capitalize">{estimate.tier}</dd>
          </div>
          <div className="rounded-lg border border-border bg-surface/40 px-3 py-2">
            <dt className="text-[11px] uppercase tracking-wide text-text-secondary">
              {t('settings.cost.input_tokens')}
            </dt>
            <dd className="mt-1 font-mono text-text-primary">
              ~{estimate.estimatedInputTokens.toLocaleString()}
            </dd>
          </div>
          <div className="rounded-lg border border-border bg-surface/40 px-3 py-2">
            <dt className="text-[11px] uppercase tracking-wide text-text-secondary">
              {t('settings.cost.output_tokens')}
            </dt>
            <dd className="mt-1 font-mono text-text-primary">
              ~{estimate.estimatedOutputTokens.toLocaleString()}
            </dd>
          </div>
        </dl>
        <p className="text-xs text-text-secondary">
          {t('settings.cost.based_on')}{' '}
          <span className="font-mono">{tempSettings.defaults.maxArticlesToScan}</span>{' '}
          {t('settings.cost.scan')} /{' '}
          <span className="font-mono">{tempSettings.defaults.topNToSynthesize}</span>{' '}
          {t('settings.cost.top_n')} · <span className="font-mono">{tempSettings.ai.model}</span>
        </p>
        {warn && (
          <p
            className="text-xs text-accent-amber border border-accent-amber/30 bg-accent-amber/10 rounded-md px-3 py-2"
            role="status"
          >
            {t('settings.cost.warn')}
          </p>
        )}
        <p className="text-[11px] text-text-secondary opacity-80">
          {t('settings.cost.disclaimer')}
        </p>
      </div>
    </SettingCard>
  );
};
