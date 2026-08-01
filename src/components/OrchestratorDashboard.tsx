import React from 'react';
import type { KnowledgeBaseEntry, ResearchEntry } from '../types';
import { HistoryIcon } from './icons/HistoryIcon';
import { DocumentPlusIcon } from './icons/DocumentPlusIcon';
import { useKnowledgeBase } from '../contexts/KnowledgeBaseContext';
import { useTranslation } from '../hooks/useTranslation';
import type { TranslationKey } from '../i18n/translations';

interface OrchestratorDashboardProps {
  onViewReport: (entry: KnowledgeBaseEntry) => void;
  onStartNewReview: (topic: string) => void;
}

const SYNTHESIS_FOCUS_KEYS: Record<string, TranslationKey> = {
  overview: 'orchestrator.focus.overview',
  clinical: 'orchestrator.focus.clinical',
  future: 'orchestrator.focus.future',
  gaps: 'orchestrator.focus.gaps',
};

const RecentEntryCard: React.FC<{
  entry: ResearchEntry;
  onViewReport: (entry: KnowledgeBaseEntry) => void;
  onStartNewReview: (topic: string) => void;
}> = ({ entry, onViewReport, onStartNewReview }) => {
  const { t } = useTranslation();
  const focusKey = SYNTHESIS_FOCUS_KEYS[entry.input.synthesisFocus];
  const focusLabel = focusKey ? t(focusKey) : entry.input.synthesisFocus;

  return (
    <article className="bg-surface border border-border rounded-lg p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:border-brand-accent/50 hover:-translate-y-1 group focus-within:ring-2 focus-within:ring-brand-accent focus-within:border-brand-accent/50">
      <p className="text-xs text-text-secondary mb-2">
        {t('orchestrator.dashboard.report_from', {
          date: new Date(entry.timestamp).toLocaleDateString(),
        })}
      </p>
      <button
        type="button"
        onClick={() => onStartNewReview(entry.input.researchTopic)}
        className="font-semibold text-text-primary mb-3 h-20 overflow-hidden text-left group-hover:text-brand-accent focus-ring-aa focus:text-brand-accent transition-colors w-full rounded"
        title={t('orchestrator.dashboard.start_new_search', {
          topic: entry.input.researchTopic,
        })}
      >
        {entry.title}
      </button>
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary border-t border-border pt-3">
        <span>
          {t('orchestrator.dashboard.articles', {
            count: entry.report.rankedArticles.length,
          })}
        </span>
        <span>
          <strong>{t('orchestrator.dashboard.focus_label')}</strong> {focusLabel}
        </span>
      </p>
      <button
        type="button"
        onClick={() => onViewReport(entry)}
        className="w-full mt-5 inline-flex justify-center items-center py-2 px-4 border border-border shadow-sm text-sm font-semibold rounded-md text-text-primary bg-background group-hover:bg-brand-accent group-hover:text-brand-text-on-accent focus-ring-aa transition-colors"
      >
        {t('orchestrator.dashboard.view_report')}
      </button>
    </article>
  );
};

const EmptyDashboard: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="text-center text-text-secondary p-8 flex flex-col items-center justify-center h-full mt-10 animate-fadeIn">
      <DocumentPlusIcon className="h-24 w-24 text-border mb-6" />
      <h2 className="text-2xl font-bold text-text-primary mb-3">
        {t('orchestrator.dashboard.empty.title')}
      </h2>
      <p className="max-w-xl mx-auto text-base">{t('orchestrator.dashboard.empty.body')}</p>
    </div>
  );
};

const DashboardComponent: React.FC<OrchestratorDashboardProps> = ({
  onViewReport,
  onStartNewReview,
}) => {
  const { t } = useTranslation();
  const { getRecentResearchEntries } = useKnowledgeBase();
  const recentEntries = getRecentResearchEntries(3);

  if (recentEntries.length === 0) {
    return <EmptyDashboard />;
  }

  return (
    <div className="mt-12 animate-fadeIn">
      <div className="flex items-center gap-3 mb-6">
        <HistoryIcon className="h-7 w-7 brand-gradient-text" />
        <h2 className="text-2xl font-bold text-text-primary">
          {t('orchestrator.dashboard.recent')}
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recentEntries.map((entry: ResearchEntry) => (
          <RecentEntryCard
            key={entry.id}
            entry={entry}
            onViewReport={onViewReport}
            onStartNewReview={onStartNewReview}
          />
        ))}
      </div>
    </div>
  );
};

export const OrchestratorDashboard = React.memo(DashboardComponent);
