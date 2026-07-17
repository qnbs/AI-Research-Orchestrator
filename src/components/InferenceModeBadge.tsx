import React from 'react';
import { useInferenceMode } from '../hooks/useInferenceMode';
import { useTranslation } from '../hooks/useTranslation';
import type { TranslationKey } from '../i18n/translations';

/**
 * Persistent, non-intrusive inference-mode indicator for the header / orchestrator.
 */
export const InferenceModeBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { mode, reason } = useInferenceMode();
  const { t } = useTranslation();

  const isLive = mode === 'live';
  const title =
    reason === 'live'
      ? t('inference.tooltip.live')
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
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium tracking-wide ${
        isLive
          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
          : 'border-amber-500/40 bg-amber-500/10 text-amber-200'
      } ${className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${isLive ? 'bg-emerald-400' : 'bg-amber-400'}`}
        aria-hidden
      />
      {t(badgeKey)}
    </span>
  );
};
