import React, { useId, useState } from 'react';
import { useJournalsView } from './JournalsViewContext';
import { useTranslation } from '../../hooks/useTranslation';
import { Article, JournalMetrics } from '../../types';
import { ChartBarIcon } from '../icons/ChartBarIcon';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';
import { ChevronLeftIcon } from '../icons/ChevronLeftIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { AnalysisCharts, ArticleListItem } from './JournalsSubComponents';

const ProfileAccordion: React.FC<{
  title: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const id = useId();
  const panelId = `journal-accordion-panel-${id}`;
  const buttonId = `journal-accordion-button-${id}`;

  return (
    <div className="border border-border rounded-lg bg-surface overflow-hidden">
      <button
        type="button"
        id={buttonId}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="w-full flex justify-between items-center p-4 text-left text-lg font-semibold text-text-primary hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors"
      >
        <div className="flex items-center">{title}</div>
        <ChevronDownIcon
          className={`h-6 w-6 transform transition-transform duration-300 text-text-secondary ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        className={`grid transition-all duration-500 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          <div className="p-4 border-t border-border bg-background/30">{children}</div>
        </div>
      </div>
    </div>
  );
};

const MetricTile: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-background/40 border border-border rounded-lg p-4 text-center">
    <p className="text-2xl font-bold text-text-primary tabular-nums">{value}</p>
    <p className="text-xs text-text-secondary mt-1 uppercase tracking-wide">{label}</p>
  </div>
);

const MetricsDashboard: React.FC<{ metrics: JournalMetrics }> = ({ metrics }) => {
  const { t } = useTranslation();
  const sourceLabel =
    metrics.source === 'curated'
      ? t('journals.profile.metrics.source.curated')
      : metrics.source === 'ai-estimated'
        ? t('journals.profile.metrics.source.ai')
        : t('journals.profile.metrics.source.computed');

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricTile
          label={t('journals.profile.metrics.impact_factor')}
          value={metrics.impactFactor !== null ? metrics.impactFactor.toFixed(1) : '—'}
        />
        <MetricTile
          label={t('journals.profile.metrics.analyzed')}
          value={metrics.analyzedArticleCount !== null ? String(metrics.analyzedArticleCount) : '—'}
        />
        <MetricTile
          label={t('journals.profile.metrics.oa_rate')}
          value={metrics.openAccessRate !== null ? `${metrics.openAccessRate}%` : '—'}
        />
      </div>
      <p className="mt-3 text-xs text-text-secondary flex items-center gap-1.5">
        <SparklesIcon className="h-3.5 w-3.5 text-brand-accent" />
        {sourceLabel}
      </p>
    </div>
  );
};

interface JournalProfileViewProps {
  onStartResearch: (topic: string) => void;
}

export const JournalProfileView: React.FC<JournalProfileViewProps> = ({ onStartResearch }) => {
  const { journalProfile: profile, foundArticles, topic, handleReset } = useJournalsView();
  const { t } = useTranslation();

  if (!profile) return null;

  return (
    <div className="space-y-6 animate-fadeIn pt-2">
      <button
        type="button"
        onClick={handleReset}
        className="inline-flex items-center text-sm font-medium text-text-secondary hover:text-brand-accent transition-colors"
      >
        <ChevronLeftIcon className="h-4 w-4 mr-1" />
        {t('journals.profile.new_analysis')}
      </button>

      {/* Journal Header Card */}
      <div className="bg-surface p-6 rounded-lg border border-border shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
          <ChartBarIcon className="h-32 w-32 text-brand-accent" />
        </div>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div>
              <h2 className="text-3xl font-bold text-text-primary">{profile.name}</h2>
              <p className="text-sm font-mono text-brand-accent mt-1">{profile.issn}</p>
              {profile.publisher && (
                <p className="text-sm text-text-secondary mt-1">
                  {t('journals.profile.publisher')}: {profile.publisher}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                {profile.oaPolicy}
              </span>
            </div>
          </div>
          <p className="mt-6 text-text-secondary/90 max-w-3xl leading-relaxed">
            {profile.description}
          </p>

          <div className="mt-6">
            <strong className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
              {t('journals.profile.focus_areas')}
            </strong>
            <div className="flex flex-wrap gap-2">
              {profile.focusAreas.map((area) => (
                <button
                  type="button"
                  key={area}
                  onClick={() => onStartResearch(`${area} ${profile.name}`)}
                  title={t('journals.profile.start_research')}
                  className="bg-surface-hover text-text-primary text-xs font-medium px-3 py-1 rounded-full border border-border hover:border-brand-accent/60 hover:text-brand-accent transition-colors focus:outline-none focus:ring-2 focus:ring-brand-accent"
                >
                  {area}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Accordions */}
      <div className="space-y-4">
        <ProfileAccordion
          title={
            <span className="flex items-center gap-2">
              <ChartBarIcon className="h-5 w-5 text-brand-accent" />
              {t('journals.section.overview')}
            </span>
          }
          defaultOpen
        >
          {profile.metrics ? (
            <MetricsDashboard metrics={profile.metrics} />
          ) : (
            <p className="text-sm text-text-secondary">{profile.description}</p>
          )}
        </ProfileAccordion>

        <ProfileAccordion
          title={
            <span className="flex items-center gap-2">
              <SparklesIcon className="h-5 w-5 text-brand-accent" />
              {t('journals.section.articles')}
              {foundArticles && (
                <span className="text-xs font-medium bg-brand-accent text-white px-2 py-0.5 rounded-full">
                  {foundArticles.length}
                </span>
              )}
            </span>
          }
          defaultOpen
        >
          {foundArticles && foundArticles.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <AnalysisCharts />
              <div className="lg:col-span-2 flex flex-col">
                <h3 className="text-base font-bold text-text-primary mb-4">
                  {t('journals.profile.articles.title')}{' '}
                  {topic.trim() && (
                    <span className="font-normal text-text-secondary">
                      {t('journals.profile.articles.on_topic')} "{topic}"
                    </span>
                  )}
                </h3>
                <div className="space-y-3 overflow-y-auto pr-2 max-h-[500px] scrollbar-thin">
                  {foundArticles.map((article: Article) => (
                    <ArticleListItem key={article.pmid} article={article} />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8 text-text-secondary">
              <p>{t('journals.profile.articles.empty')}</p>
              <p className="text-sm mt-2">{t('journals.profile.articles.empty_hint')}</p>
            </div>
          )}
        </ProfileAccordion>
      </div>
    </div>
  );
};
