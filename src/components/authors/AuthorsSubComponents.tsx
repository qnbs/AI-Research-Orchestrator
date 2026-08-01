import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAuthorsView } from './AuthorsViewContext';
import { ChevronLeftIcon } from '../icons/ChevronLeftIcon';
import { ChevronRightIcon } from '../icons/ChevronRightIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { DnaIcon } from '../icons/DnaIcon';
import { HeartIcon } from '../icons/HeartIcon';
import { BugAntIcon } from '../icons/BugAntIcon';
import { BrainIcon } from '../icons/BrainIcon';
import { BeakerIcon } from '../icons/BeakerIcon';
import { ChartBarIcon } from '../icons/ChartBarIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { useTranslation } from '../../hooks/useTranslation';

export { AuthorProfileView } from './AuthorProfileView';

const categoryIcons: { [key: string]: React.FC<React.SVGProps<SVGSVGElement>> } = {
  'Genetics & Genomics': DnaIcon,
  'CRISPR & Gene Editing': DnaIcon,
  'Cancer Research': HeartIcon,
  'Immunology & Infectious Disease': BugAntIcon,
  Neuroscience: BrainIcon,
  'Biochemistry & Pharmacology': BeakerIcon,
  'Cardiology & Public Health': HeartIcon,
  'Bioengineering & Regenerative Medicine': BeakerIcon,
  'AI & Computational Biology': ChartBarIcon,
};

export const AuthorCard: React.FC<{ name: string; description: string; onClick: () => void }> = ({
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
      <div className="flex items-center gap-3 mb-3">
        <div className="h-10 w-10 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent font-bold text-sm">
          {name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase()}
        </div>
        <h4 className="text-lg font-bold text-text-primary transition-colors duration-300 group-hover:brand-gradient-text">
          {name}
        </h4>
      </div>
      <p className="text-sm text-text-secondary leading-relaxed">{description}</p>
      <div className="absolute bottom-4 right-4 flex items-center text-xs font-semibold text-text-secondary opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300">
        {t('authors.analyze')} <ChevronRightIcon className="h-4 w-4 ml-1" />
      </div>
    </button>
  );
};

export const FeaturedAuthorsView: React.FC = () => {
  const {
    featuredCategories: categories,
    handleSearch: onSelectAuthor,
    isFeaturedLoading: isLoading,
    featuredError: error,
  } = useAuthorsView();
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 9;
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({ canScrollLeft: false, canScrollRight: true });

  const checkScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const canScrollLeft = el.scrollLeft > 5;
    const canScrollRight =
      el.scrollWidth > el.clientWidth && el.scrollLeft < el.scrollWidth - el.clientWidth - 5;
    setScrollState({ canScrollLeft, canScrollRight });
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    checkScroll();
    window.addEventListener('resize', checkScroll);
    scroller.addEventListener('scroll', checkScroll);
    return () => {
      window.removeEventListener('resize', checkScroll);
      scroller.removeEventListener('scroll', checkScroll);
    };
  }, [checkScroll, categories]);

  const handleScroll = (direction: 'left' | 'right') => {
    scrollerRef.current?.scrollBy({ left: direction === 'left' ? -300 : 300, behavior: 'smooth' });
  };

  useEffect(() => {
    if (categories && categories.length > 0 && !activeCategory) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- defaults the selection once data arrives; activeCategory remains user-selectable after.
      setActiveCategory(categories[0].category);
    }
  }, [categories, activeCategory]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets pagination when the filter changes; currentPage is otherwise user-driven.
    setCurrentPage(0);
  }, [activeCategory]);

  const activeAuthors = useMemo(() => {
    if (!activeCategory) return [];
    return categories.find((cat) => cat.category === activeCategory)?.authors || [];
  }, [activeCategory, categories]);

  const totalPages = Math.ceil(activeAuthors.length / ITEMS_PER_PAGE);
  const paginatedAuthors = activeAuthors.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE,
  );

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-accent mx-auto mb-4"></div>
        <p className="text-text-secondary">{t('authors.featured.loading')}</p>
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

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-text-primary text-center">
        {t('authors.featured.title')}
      </h2>

      <div className="relative group">
        <button
          onClick={() => handleScroll('left')}
          aria-label={t('authors.featured.scroll_left')}
          className={`absolute -left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-surface border border-border shadow-lg transition-all opacity-0 group-hover:opacity-100 hover:bg-surface-hover disabled:opacity-0 disabled:cursor-not-allowed ${scrollState.canScrollLeft ? '' : 'opacity-0'}`}
          disabled={!scrollState.canScrollLeft}
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <div
          className="absolute top-0 left-0 h-full w-16 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none transition-opacity"
          style={{ opacity: scrollState.canScrollLeft ? 1 : 0 }}
        ></div>

        <div
          ref={scrollerRef}
          className="flex items-center space-x-2 overflow-x-auto py-2 px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {categories.map((category) => {
            const Icon = categoryIcons[category.category.trim()] || SparklesIcon;
            return (
              <button
                key={category.category}
                onClick={() => setActiveCategory(category.category)}
                className={`flex items-center gap-x-2.5 px-4 py-2 text-sm font-semibold rounded-md transition-all whitespace-nowrap border-2 ${
                  activeCategory === category.category
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
        <div
          className="absolute top-0 right-0 h-full w-16 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none transition-opacity"
          style={{ opacity: scrollState.canScrollRight ? 1 : 0 }}
        ></div>
        <button
          onClick={() => handleScroll('right')}
          aria-label={t('authors.featured.scroll_right')}
          className={`absolute -right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-surface border border-border shadow-lg transition-all opacity-0 group-hover:opacity-100 hover:bg-surface-hover disabled:opacity-0 ${scrollState.canScrollRight ? '' : 'opacity-0'}`}
          disabled={!scrollState.canScrollRight}
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>

      <div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {paginatedAuthors.map((author, index) => (
            <div
              key={author.name}
              className="animate-fadeIn"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <AuthorCard
                name={author.name}
                description={author.description}
                onClick={() => onSelectAuthor(author.name)}
              />
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center mt-6 gap-4">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
              disabled={currentPage === 0}
              className="p-2 bg-surface border border-border rounded-full shadow-lg transition-all duration-300 hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={t('authors.featured.prev_page')}
            >
              <ChevronLeftIcon className="h-6 w-6 text-text-primary" />
            </button>

            <span className="text-sm font-medium text-text-secondary tabular-nums">
              {t('authors.featured.page', { current: currentPage + 1, total: totalPages })}
            </span>

            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))}
              disabled={currentPage >= totalPages - 1}
              className="p-2 bg-surface border border-border rounded-full shadow-lg transition-all duration-300 hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={t('authors.featured.next_page')}
            >
              <ChevronRightIcon className="h-6 w-6 text-text-primary" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const LandingView: React.FC = () => {
  const {
    handleSearch: onSearch,
    handleSuggestAuthors: onSuggest,
    isSuggesting,
    suggestionError,
    error: searchError,
    suggestedAuthors,
  } = useAuthorsView();
  const { t } = useTranslation();
  const [mode, setMode] = useState<'search' | 'suggest'>('search');
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
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
    }
  };

  return (
    <div className="pt-2 space-y-12">
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold brand-gradient-text">{t('authors.title')}</h1>
          <p className="mt-2 text-lg text-text-secondary max-w-3xl mx-auto">
            {t('authors.subtitle')}
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
                {t('authors.mode.analyze')}
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('suggest')}
                className={`w-1/2 p-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'suggest' ? 'bg-brand-accent text-brand-text-on-accent' : 'text-text-secondary hover:bg-surface'}`}
              >
                {t('authors.mode.suggest')}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  mode === 'search'
                    ? t('authors.placeholder.analyze')
                    : t('authors.placeholder.suggest')
                }
                className="w-full bg-transparent p-2 focus-ring-aa rounded-md text-text-primary"
                aria-label={
                  mode === 'search' ? t('authors.aria.analyze') : t('authors.aria.suggest')
                }
              />
              <button
                type="submit"
                disabled={!query.trim() || isSuggesting}
                className="px-4 py-2 bg-brand-accent text-brand-text-on-accent rounded-md font-semibold disabled:opacity-50 flex items-center"
              >
                {mode === 'search' ? (
                  <>
                    <SearchIcon className="h-4 w-4 mr-2" />
                    {t('authors.analyze')}
                  </>
                ) : (
                  <>
                    <SparklesIcon className="h-4 w-4 mr-2" />
                    {t('authors.suggest')}
                  </>
                )}
              </button>
            </div>
          </form>
          {searchError && <p className="text-center text-red-400 mt-4 text-sm">{searchError}</p>}
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        {isSuggesting && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-accent mx-auto mb-4"></div>
            <p className="text-text-secondary">{t('authors.suggest.loading')}</p>
          </div>
        )}
        {suggestionError && <p className="text-center text-red-400">{suggestionError}</p>}
        {suggestedAuthors && (
          <div className="animate-fadeIn">
            <h2 className="text-2xl font-bold text-text-primary text-center mb-6">
              {t('authors.suggest.heading')} “{query}”
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {suggestedAuthors.map((author) => (
                <AuthorCard
                  key={author.name}
                  name={author.name}
                  description={author.description}
                  onClick={() => onSearch(author.name)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const DisambiguationView: React.FC = () => {
  const { authorClusters: clusters, handleSelectCluster: onSelect, authorQuery } = useAuthorsView();
  const { t } = useTranslation();
  if (!clusters) return null;

  return (
    <div className="mt-8 animate-fadeIn pt-2">
      <h2 className="text-2xl font-bold text-text-primary text-center">
        {t('authors.disambiguation.title')}
      </h2>
      <p className="text-center text-text-secondary mt-2">
        {t('authors.disambiguation.prefix')} “{authorQuery}”. {t('authors.disambiguation.suffix')}
      </p>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {clusters.map((cluster, index) => (
          <button
            key={index}
            onClick={() => onSelect(cluster)}
            className="group w-full h-full p-5 bg-surface border border-border rounded-lg text-left transition-all duration-300 hover:shadow-xl hover:border-brand-accent/50 hover:-translate-y-1.5 focus:outline-none focus:ring-2 focus:ring-brand-accent ring-offset-2 ring-offset-background"
          >
            <h3 className="text-lg font-bold brand-gradient-text group-hover:brand-gradient-text transition-colors duration-300">
              {cluster.nameVariant}
            </h3>
            <div className="mt-3 space-y-2 text-sm text-text-secondary">
              <p>
                <strong className="text-text-primary">{cluster.publicationCount}</strong>{' '}
                {t('authors.disambiguation.publications')}
              </p>
              <p>
                <strong>{t('authors.disambiguation.affiliation')}</strong>{' '}
                {cluster.primaryAffiliation || t('authors.na')}
              </p>
              <p>
                <strong>{t('authors.disambiguation.topics')}</strong>{' '}
                {cluster.coreTopics.join(', ')}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
