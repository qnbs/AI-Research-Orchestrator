/**
 * Soft-resume banner for interrupted research runs (P0-10).
 * Restores partial report state; full phase-skip resume remains out of scope (ADR).
 */
import React from 'react';
import type { ResearchCheckpoint } from '../lib/researchCheckpoint';
import { formatCheckpointAge, isResumableCheckpoint } from '../lib/researchCheckpoint';
import { useTranslation } from '../hooks/useTranslation';

export interface CheckpointResumeBannerProps {
  checkpoints: ResearchCheckpoint[];
  onRestore: (checkpoint: ResearchCheckpoint) => void;
  onRerun: (checkpoint: ResearchCheckpoint) => void;
  onDiscard: (id: string) => void;
}

export const CheckpointResumeBanner: React.FC<CheckpointResumeBannerProps> = ({
  checkpoints,
  onRestore,
  onRerun,
  onDiscard,
}) => {
  const { t } = useTranslation();
  const resumable = checkpoints.filter(isResumableCheckpoint).slice(0, 3);

  if (resumable.length === 0) return null;

  return (
    <section
      className="rounded-xl border border-accent-amber/30 bg-accent-amber/5 p-4 space-y-3"
      aria-label={t('checkpoint.resume.title')}
    >
      <div>
        <h2 className="text-sm font-semibold text-text-primary">{t('checkpoint.resume.title')}</h2>
        <p className="text-xs text-text-secondary mt-0.5">{t('checkpoint.resume.desc')}</p>
      </div>

      <ul className="space-y-2">
        {resumable.map((ckpt) => {
          const articleCount = ckpt.report?.rankedArticles?.length ?? 0;
          const hasSynth = Boolean(ckpt.synthesisSoFar.trim() || ckpt.report?.synthesis?.trim());
          return (
            <li
              key={ckpt.id}
              className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-lg border border-border bg-surface/60 px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-primary truncate" title={ckpt.topic}>
                  {ckpt.topic}
                </p>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  {ckpt.phase} · {formatCheckpointAge(ckpt.updatedAt)} ·{' '}
                  {ckpt.reason === 'abort'
                    ? t('checkpoint.reason.abort')
                    : ckpt.reason === 'error'
                      ? t('checkpoint.reason.error')
                      : t('checkpoint.reason.manual')}
                  {articleCount > 0 && ` · ${articleCount} ${t('checkpoint.articles')}`}
                  {hasSynth && ` · ${t('checkpoint.has_synthesis')}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => onRestore(ckpt)}
                  className="text-xs px-2.5 py-1.5 rounded-md bg-brand-accent/15 text-brand-accent border border-brand-accent/30 hover:bg-brand-accent/25 transition-colors"
                >
                  {t('checkpoint.restore')}
                </button>
                <button
                  type="button"
                  onClick={() => onRerun(ckpt)}
                  className="text-xs px-2.5 py-1.5 rounded-md bg-surface text-text-primary border border-border hover:bg-surface-hover transition-colors"
                >
                  {t('checkpoint.rerun')}
                </button>
                <button
                  type="button"
                  onClick={() => onDiscard(ckpt.id)}
                  className="text-xs px-2.5 py-1.5 rounded-md text-text-secondary hover:text-red-400 transition-colors"
                >
                  {t('checkpoint.discard')}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default CheckpointResumeBanner;
