import React, { memo } from 'react';
import type { ReportStatus, ResearchInput } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import {
  orchestratorBriefStatusKey,
  resolveOrchestratorTaskPhase,
} from '../lib/orchestratorTaskPhase';

export interface ResearchBriefSummaryProps {
  input: ResearchInput;
  reportStatus: ReportStatus;
  hasReport: boolean;
  isSaved: boolean;
  isProcessing: boolean;
  onEdit: () => void;
  onNewSearch: () => void;
}

const ResearchBriefSummaryComponent: React.FC<ResearchBriefSummaryProps> = ({
  input,
  reportStatus,
  hasReport,
  isSaved,
  isProcessing,
  onEdit,
  onNewSearch,
}) => {
  const { t } = useTranslation();
  const phase = resolveOrchestratorTaskPhase({
    reportStatus,
    hasReport,
    hasBrief: true,
  });
  const statusKey = orchestratorBriefStatusKey(phase, isSaved);

  return (
    <section
      className="rounded-lg border border-border bg-surface/80 p-4 space-y-3"
      aria-label={t('orchestrator.brief.aria')}
      data-testid="research-brief-summary"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            {t('orchestrator.brief.label')}
          </p>
          <p className="text-base font-medium text-text-primary break-words">
            {input.researchTopic}
          </p>
          <p className="text-xs text-brand-accent font-medium">{t(statusKey)}</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={onEdit}
            disabled={isProcessing}
            className="px-3 py-2 text-sm font-medium rounded-md border border-border bg-surface hover:bg-surface-hover focus-ring-aa touch-target-aa disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('orchestrator.brief.edit')}
          </button>
          <button
            type="button"
            onClick={onNewSearch}
            className="px-3 py-2 text-sm font-medium rounded-md border border-brand-accent/40 text-brand-accent hover:bg-brand-accent/10 focus-ring-aa touch-target-aa"
          >
            {t('orchestrator.new_search')}
          </button>
        </div>
      </div>
      <details className="text-xs text-text-secondary">
        <summary className="cursor-pointer select-none font-medium text-text-primary/90">
          {t('orchestrator.brief.criteria_toggle')}
        </summary>
        <ul className="mt-2 space-y-1 list-disc pl-5">
          <li>{t('orchestrator.brief.criteria_dates', { range: input.dateRange })}</li>
          <li>
            {t('orchestrator.brief.criteria_scan', {
              scan: String(input.maxArticlesToScan),
              top: String(input.topNToSynthesize),
            })}
          </li>
          {input.includeArxiv ? <li>{t('orchestrator.brief.criteria_arxiv')}</li> : null}
          {input.educationalDemoMode ? <li>{t('orchestrator.brief.criteria_demo')}</li> : null}
        </ul>
      </details>
    </section>
  );
};

export const ResearchBriefSummary = memo(ResearchBriefSummaryComponent);
