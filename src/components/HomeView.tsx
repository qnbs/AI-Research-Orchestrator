import React from 'react';
import type { View } from '../contexts/UIContext';
import { DocumentIcon } from './icons/DocumentIcon';
import { BeakerIcon } from './icons/BeakerIcon';
import { AppBrandMark } from './AppBrandMark';
import { useTranslation } from '../hooks/useTranslation';
import { useKnowledgeBase } from '../contexts/KnowledgeBaseContext';
import { InferenceModeBadge } from './InferenceModeBadge';

interface HomeViewProps {
  onNavigate: (view: View) => void;
}

const ActionButton: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  primary?: boolean;
}> = ({ icon, title, description, onClick, primary }) => (
  <button
    type="button"
    onClick={onClick}
    className={`text-left bg-surface p-6 rounded-lg border shadow-lg hover:shadow-xl hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 transition-all duration-300 group focus-ring-aa ${
      primary
        ? 'border-brand-accent/40 hover:border-brand-accent'
        : 'border-border hover:border-brand-accent/50'
    }`}
  >
    <div className="flex items-center gap-4">
      <div
        className={`flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-lg border transition-colors duration-300 ${
          primary
            ? 'bg-brand-accent text-brand-text-on-accent border-brand-accent'
            : 'bg-background border-border text-brand-accent group-hover:text-brand-text-on-accent group-hover:bg-brand-accent'
        }`}
      >
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-bold text-text-primary group-hover:brand-gradient-text transition-colors">
          {title}
        </h3>
        <p className="text-sm text-text-secondary mt-1">{description}</p>
      </div>
    </div>
  </button>
);

const HomeView: React.FC<HomeViewProps> = ({ onNavigate }) => {
  const { t } = useTranslation();
  const { uniqueArticles, getRecentResearchEntries } = useKnowledgeBase();
  const lastReport = getRecentResearchEntries(1)[0];
  const articleCount = uniqueArticles.length;

  return (
    <div className="max-w-4xl mx-auto text-center py-8 animate-fadeIn">
      <div className="inline-block relative mb-6">
        <AppBrandMark size="xl" showEmoji idPrefix="home-logo" aria-hidden />
      </div>
      <h1 className="text-4xl sm:text-5xl font-bold text-text-primary mb-3">{t('app.name')}</h1>
      <p className="max-w-2xl mx-auto text-lg text-text-secondary mb-8">{t('home.welcome')}</p>

      <div
        className="flex flex-wrap items-center justify-center gap-3 mb-10 text-sm text-text-secondary"
        role="group"
      >
        <InferenceModeBadge />
        <span className="px-3 py-1 rounded-full border border-border bg-surface/60">
          {articleCount === 1
            ? t('home.status.library_one', { count: 1 })
            : articleCount > 0
              ? t('home.status.library', { count: articleCount })
              : t('home.status.library_empty')}
        </span>
        <span className="px-3 py-1 rounded-full border border-border bg-surface/60 max-w-xs truncate">
          {lastReport
            ? t('home.status.last_report', { title: lastReport.title })
            : t('home.status.no_report')}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left max-w-3xl mx-auto">
        <ActionButton
          primary
          icon={<DocumentIcon className="h-6 w-6" />}
          title={t('home.hero.title')}
          description={t('home.hero.desc')}
          onClick={() => onNavigate('orchestrator')}
        />
        <ActionButton
          icon={<BeakerIcon className="h-6 w-6" />}
          title={t('home.secondary.title')}
          description={t('home.secondary.desc')}
          onClick={() => onNavigate('research')}
        />
      </div>

      <section className="mt-12 max-w-2xl mx-auto text-left">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary mb-3">
          {t('home.how.title')}
        </h2>
        <ol className="space-y-2 text-sm text-text-secondary list-decimal list-inside">
          <li>{t('home.how.1')}</li>
          <li>{t('home.how.2')}</li>
          <li>{t('home.how.3')}</li>
          <li>{t('home.how.4')}</li>
        </ol>
      </section>
    </div>
  );
};

export default HomeView;
