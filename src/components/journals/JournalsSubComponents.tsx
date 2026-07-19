import React, { useState } from 'react';
import { useJournalsView } from './JournalsViewContext';
import { Article, JournalCandidate } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { ChevronRightIcon } from '../icons/ChevronRightIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { DnaIcon } from '../icons/DnaIcon';
import { HeartIcon } from '../icons/HeartIcon';
import { ChartBarIcon } from '../icons/ChartBarIcon';
import { UnlockIcon } from '../icons/UnlockIcon';
import { Toggle } from '../Toggle';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const categoryIcons: { [key: string]: React.FC<React.SVGProps<SVGSVGElement>> } = {
  'Open Access Mega-Journals': UnlockIcon,
  Multidisciplinary: SparklesIcon,
  'Life Sciences & Cell Biology': DnaIcon,
  'Clinical Medicine': HeartIcon,
  'Methods & Computational': ChartBarIcon,
};

export const JournalCard: React.FC<{ name: string; description: string; onClick: () => void }> = ({
  name,
  description,
  onClick,
}) => {
  const { t } = useTranslation();
  return (
    <button
      onClick={onClick}
      className="group relative w-full h-full p-5 bg-surface border border-border rounded-lg text-left transition-all duration-300 hover:shadow-xl hover:border-brand-accent/50 hover:-translate-y-1.5 focus:outline-none focus:ring-2 focus:ring-brand-accent ring-offset-2 ring-offset-background"
    >
      <h4 className="text-lg font-bold text-text-primary transition-colors duration-300 group-hover:brand-gradient-text mb-2">
        {name}
      </h4>
      <p className="text-sm text-text-secondary leading-relaxed">{description}</p>
      <div className="absolute bottom-4 right-4 flex items-center text-xs font-semibold text-text-secondary opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300">
        {t('journals.analyze')} <ChevronRightIcon className="h-4 w-4 ml-1" />
      </div>
    </button>
  );
};

export const ArticleListItem: React.FC<{ article: Article }> = ({ article }) => (
  <a
    href={`https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`}
    target="_blank"
    rel="noopener noreferrer"
    className="block p-4 bg-surface border border-border rounded-lg hover:bg-surface-hover hover:border-brand-accent/50 transition-all duration-200 group"
  >
    <div className="flex justify-between items-start gap-4">
      <div>
        <p className="font-semibold text-sm text-text-primary group-hover:text-brand-accent transition-colors line-clamp-2">
          {article.title}
        </p>
        <p className="text-xs text-text-secondary mt-1.5">{article.authors}</p>
      </div>
      {article.pubYear && (
        <span className="text-xs font-mono bg-surface-hover border border-border px-2 py-0.5 rounded text-text-secondary whitespace-nowrap">
          {article.pubYear}
        </span>
      )}
    </div>
  </a>
);

/** Landing view: dual-mode search (analyze a journal / suggest journals by field). */
export const JournalLandingView: React.FC = () => {
  const {
    topic,
    setTopic,
    onlyOa,
    setOnlyOa,
    handleSearch: onSearch,
    handleSuggestJournals: onSuggest,
    isSuggesting,
    suggestionError,
    error: searchError,
    suggestedJournals,
    handleFeaturedSelect,
  } = useJournalsView();
  const { t } = useTranslation();
  const [mode, setMode] = useState<'search' | 'suggest'>('search');
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSubmittedQuery(query.trim());
    if (mode === 'search') {
      onSearch(query.trim());
    } else {
      onSuggest(query.trim());
    }
  };

  const handleModeChange = (newMode: 'search' | 'suggest') => {
    if (mode !== newMode) {
      setMode(newMode);
      setQuery('');
      setSubmittedQuery(null);
    }
  };

  return (
    <div className="pt-2 space-y-12">
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold brand-gradient-text">{t('journals.title')}</h1>
          <p className="mt-2 text-lg text-text-secondary max-w-3xl mx-auto">
            {t('journals.subtitle')}
          </p>
        </div>
        <div className="max-w-2xl mx-auto">
          <form
            onSubmit={handleSubmit}
            className="p-2 bg-surface border border-border rounded-lg shadow-lg"
          >
            <div className="flex w-full bg-background p-1 rounded-lg border border-border mb-2">
              <button
                type="button"
                onClick={() => handleModeChange('search')}
                className={`w-1/2 p-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'search' ? 'bg-brand-accent text-brand-text-on-accent' : 'text-text-secondary hover:bg-surface'}`}
              >
                {t('journals.mode.analyze')}
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('suggest')}
                className={`w-1/2 p-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'suggest' ? 'bg-brand-accent text-brand-text-on-accent' : 'text-text-secondary hover:bg-surface'}`}
              >
                {t('journals.mode.suggest')}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  mode === 'search'
                    ? t('journals.placeholder.analyze')
                    : t('journals.placeholder.suggest')
                }
                className="w-full bg-transparent p-2 focus:outline-none text-text-primary"
                aria-label={
                  mode === 'search' ? t('journals.aria.analyze') : t('journals.aria.suggest')
                }
              />
              <button
                type="submit"
                disabled={!query.trim() || (isSuggesting && mode === 'suggest')}
                className="px-4 py-2 bg-brand-accent text-brand-text-on-accent rounded-md font-semibold disabled:opacity-50 flex items-center"
              >
                {mode === 'search' ? (
                  <>
                    <SearchIcon className="h-4 w-4 mr-2" />
                    {t('journals.analyze')}
                  </>
                ) : (
                  <>
                    <SparklesIcon className="h-4 w-4 mr-2" />
                    {t('journals.suggest')}
                  </>
                )}
              </button>
            </div>
            {mode === 'search' && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 px-1 pt-2">
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder={t('journals.topic_placeholder')}
                  aria-label={t('journals.topic_label')}
                  className="w-full sm:w-2/3 bg-transparent border border-border rounded-md py-1.5 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent text-text-primary"
                />
                <div className="flex items-center bg-background/50 p-1.5 rounded-md border border-border">
                  <Toggle checked={onlyOa} onChange={setOnlyOa}>
                    <div className="flex items-center gap-2 text-sm">
                      <UnlockIcon
                        className={`h-4 w-4 ${onlyOa ? 'text-green-400' : 'text-text-secondary'}`}
                      />
                      <span>{t('journals.oa_only')}</span>
                    </div>
                  </Toggle>
                </div>
              </div>
            )}
          </form>
          {searchError && <p className="text-center text-red-400 mt-4 text-sm">{searchError}</p>}
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        {isSuggesting && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-accent mx-auto mb-4"></div>
            <p className="text-text-secondary">{t('journals.suggest.loading')}</p>
          </div>
        )}
        {suggestionError && <p className="text-center text-red-400">{suggestionError}</p>}
        {suggestedJournals && (
          <div className="animate-fadeIn">
            <h2 className="text-2xl font-bold text-text-primary text-center mb-6">
              {t('journals.suggest.heading')} "{submittedQuery ?? query}"
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {suggestedJournals.map((journal) => (
                <JournalCard
                  key={journal.name}
                  name={journal.name}
                  description={journal.description}
                  onClick={() => handleFeaturedSelect(journal.name)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/** Categorized featured journals with icon tabs (mirrors FeaturedAuthorsView). */
export const FeaturedJournalsView: React.FC = () => {
  const {
    featuredCategories: categories,
    handleFeaturedSelect,
    isFeaturedLoading: isLoading,
    featuredError: error,
  } = useJournalsView();
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  React.useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].category);
    }
  }, [categories, activeCategory]);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-accent mx-auto mb-4"></div>
        <p className="text-text-secondary">{t('journals.featured.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-400 bg-surface rounded-lg border border-red-500/20">
        <p>{error}</p>
      </div>
    );
  }

  if (categories.length === 0) return null;

  const activeJournals =
    categories.find((cat) => cat.category === activeCategory)?.journals ??
    categories[0]?.journals ??
    [];

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-text-primary">{t('journals.featured.title')}</h2>
        <p className="text-text-secondary text-sm mt-1">{t('journals.featured.subtitle')}</p>
      </div>

      <div
        className="flex items-center gap-2 overflow-x-auto py-2 px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label={t('journals.featured.title')}
      >
        {categories.map((category) => {
          const Icon = categoryIcons[category.category.trim()] || SparklesIcon;
          const isActive = activeCategory === category.category;
          return (
            <button
              key={category.category}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveCategory(category.category)}
              className={`flex items-center gap-x-2.5 px-4 py-2 text-sm font-semibold rounded-md transition-all whitespace-nowrap border-2 ${
                isActive
                  ? 'bg-brand-accent text-brand-text-on-accent border-brand-accent shadow-md'
                  : 'text-text-secondary bg-surface border-border hover:border-brand-accent/50 hover:text-text-primary'
              }`}
            >
              <Icon className="h-5 w-5" />
              {category.category}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {activeJournals.map((journal, index) => (
          <div
            key={journal.name}
            className="animate-fadeIn"
            style={{ animationDelay: `${index * 30}ms` }}
          >
            <JournalCard
              name={journal.name}
              description={journal.description}
              onClick={() => handleFeaturedSelect(journal.name)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

/** Disambiguation: pick the correct journal among candidates. */
export const JournalDisambiguationView: React.FC = () => {
  const { candidates, handleSelectCandidate, journalName } = useJournalsView();
  const { t } = useTranslation();
  if (!candidates) return null;

  return (
    <div className="mt-8 animate-fadeIn pt-2">
      <h2 className="text-2xl font-bold text-text-primary text-center">
        {t('journals.disambiguation.title')}
      </h2>
      <p className="text-center text-text-secondary mt-2">
        {t('journals.disambiguation.subtitle')} ({journalName})
      </p>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {candidates.map((candidate: JournalCandidate) => (
          <button
            key={candidate.name}
            onClick={() => handleSelectCandidate(candidate)}
            className="group w-full h-full p-5 bg-surface border border-border rounded-lg text-left transition-all duration-300 hover:shadow-xl hover:border-brand-accent/50 hover:-translate-y-1.5 focus:outline-none focus:ring-2 focus:ring-brand-accent ring-offset-2 ring-offset-background"
          >
            <h3 className="text-lg font-bold text-text-primary group-hover:brand-gradient-text transition-colors duration-300">
              {candidate.name}
            </h3>
            {candidate.issn && (
              <p className="text-xs font-mono text-brand-accent mt-1">{candidate.issn}</p>
            )}
            <div className="mt-3 space-y-2 text-sm text-text-secondary">
              <p>{candidate.description}</p>
              <p className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20 font-medium">
                  {candidate.matchType}
                </span>
                <span>
                  {candidate.confidence}% {t('journals.disambiguation.confidence')}
                </span>
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

const TOPIC_COLORS = [
  'rgba(31, 111, 235, 0.7)',
  'rgba(57, 197, 247, 0.7)',
  'rgba(232, 83, 165, 0.7)',
  'rgba(245, 158, 11, 0.7)',
  'rgba(16, 185, 129, 0.7)',
  'rgba(99, 102, 241, 0.7)',
];

export const AnalysisCharts: React.FC = () => {
  const { analyticsData, settings } = useJournalsView();
  const { t } = useTranslation();
  if (!analyticsData) return null;

  const isDarkMode = settings.theme === 'dark';
  const tickColor = isDarkMode ? '#9ca3af' : '#4b5563';
  const gridColor = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  return (
    <div className="lg:col-span-1 space-y-6">
      <div className="bg-surface p-5 rounded-lg border border-border">
        <h3 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wide">
          Recent Topic Landscape
        </h3>
        <div className="h-48">
          {analyticsData.topicData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analyticsData.topicData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="70%"
                  outerRadius="95%"
                  paddingAngle={2}
                >
                  {analyticsData.topicData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={TOPIC_COLORS[index % TOPIC_COLORS.length]} />
                  ))}
                </Pie>
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  wrapperStyle={{ fontSize: 11, color: tickColor }}
                />
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="h-full flex items-center justify-center text-sm text-text-secondary">
              {t('charts.no_topic_data')}
            </p>
          )}
        </div>
      </div>
      <div className="bg-surface p-5 rounded-lg border border-border">
        <h3 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wide">
          Activity Timeline
        </h3>
        <div className="h-32">
          {analyticsData.timelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analyticsData.timelineData}
                margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="year" tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: tickColor, fontSize: 11 }} width={28} />
                <RechartsTooltip />
                <Bar
                  dataKey="count"
                  name="Articles"
                  fill="rgba(31, 111, 235, 0.5)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="h-full flex items-center justify-center text-sm text-text-secondary">
              {t('charts.no_publication_years')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
