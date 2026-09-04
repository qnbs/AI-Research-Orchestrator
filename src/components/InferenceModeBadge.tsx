import React from 'react';
import { useInferenceMode } from '../hooks/useInferenceMode';
import { useTranslation } from '../hooks/useTranslation';
import type { TranslationKey } from '../i18n/translations';
import { providerChromeLabel } from '../services/inferenceMode';

/**
 * Persistent, non-intrusive inference-mode indicator for the header / orchestrator.
 */
export const InferenceModeBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { mode, reason, provider } = useInferenceMode();
  const { t } = useTranslation();
  const providerLabel = providerChromeLabel(provider);

  const isLive = mode === 'live';
  const title =
    reason === 'live'
      ? t('inference.tooltip.live', { provider: providerLabel })
      : reason === 'force'
        ? t('inference.tooltip.force')
        : reason === 'offline'
          ? t('inference.tooltip.offline')
          : t('inference.tooltip.no_key');

  const badgeKey: TranslationKey =
    reason === 'live'
      ? 'inference.badge.live'
      : reason === 'force'
        ? 'inference.badge.force'
        : reason === 'offline'
          ? 'inference.badge.offline'
          : reason === 'no_api_key'
            ? 'inference.badge.no_key'
            : 'inference.badge.heuristic';

  return (
    <span
      role="status"
      aria-label={title}
      title={title}
      className={`status-chip ${isLive ? 'status-chip--live' : 'status-chip--heuristic'} ${className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${isLive ? 'bg-success' : 'bg-warning'}`}
        aria-hidden
      />
      {reason === 'live' ? t(badgeKey, { provider: providerLabel }) : t(badgeKey)}
    </span>
  );
};
