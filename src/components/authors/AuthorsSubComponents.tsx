
import React, { useState, useRef, useEffect, useCallback, useMemo, useId } from 'react';
import { useAuthorsView } from './AuthorsViewContext';
import { AuthorCluster, AuthorProfile } from '../../types';
import { ChevronLeftIcon } from '../icons/ChevronLeftIcon';
import { ChevronRightIcon } from '../icons/ChevronRightIcon';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { DnaIcon } from '../icons/DnaIcon';
import { HeartIcon } from '../icons/HeartIcon';
import { BugAntIcon } from '../icons/BugAntIcon';
import { BrainIcon } from '../icons/BrainIcon';
import { BeakerIcon } from '../icons/BeakerIcon';
import { ChartBarIcon } from '../icons/ChartBarIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { DocumentIcon } from '../icons/DocumentIcon';
import { Tooltip } from '../Tooltip';
import { Bar } from 'react-chartjs-2';
import { useSettings } from '../../contexts/SettingsContext';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const categoryIcons: { [key: string]: React.FC<React.SVGProps<SVGSVGElement>> } = {
    'Genetics & Genomics': DnaIcon,
    'CRISPR & Gene Editing': DnaIcon,
    'Cancer Research': HeartIcon,
    'Immunology & Infectious Disease': BugAntIcon,
    'Neuroscience': BrainIcon,
    'Biochemistry & Pharmacology': BeakerIcon,
    'Cardiology & Public Health': HeartIcon,
    'Bioengineering & Regenerative Medicine': BeakerIcon,
    'AI & Computational Biology': ChartBarIcon
};

const secureMarkdownToHtml = (text: string): string => {
    if (!text) return '';
    const rawMarkup = marked.parse(text.trim(), { breaks: true, gfm: true }) as string;
    return DOMPurify.sanitize(rawMarkup);
};

export const AuthorCard: React.FC<{ name: string; description: string; onClick: () => void; }> = ({ name, description, onClick }) => (
    <button
        onClick={onClick}
        className="group relative w-full h-full p-5 bg-surface border border-border rounded-lg text-left transition-all duration-300 hover:shadow-xl hover:border-brand-accent/50 hover:-translate-y-1.5 focus:outline-none focus:ring-2 focus:ring-brand-accent ring-offset-2 ring-offset-background"
    >
        <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent font-bold text-sm">
                {name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </div>
            <h4 className="text-lg font-bold text-text-primary transition-colors duration-300 group-hover:brand-gradient-text">
                {name}
            </h4>
        </div>
        <p className="text-sm text-text-secondary leading-relaxed">
            {description}
        </p>
         <div className="absolute bottom-4 right-4 flex items-center text-xs font-semibold text-text-secondary opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300">
            Analyze <ChevronRightIcon className="h-4 w-4 ml-1" />
        </div>
    </button>
);

export const FeaturedAuthorsView: React.FC = () => {
    const { featuredCategories: categories, handleSearch: onSelectAuthor, isFeaturedLoading: isLoading, featuredError: error } = useAuthorsView();
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(0);
    const ITEMS_PER_PAGE = 9;
    const scrollerRef = useRef<HTMLDivElement>(null);
    const [scrollState, setScrollState] = useState({ canScrollLeft: false, canScrollRight: true });

    const checkScroll = useCallback(() => {
        const el = scrollerRef.current;
        if (!el) return;
        const canScrollLeft = el.scrollLeft > 5;
        const canScrollRight = el.scrollWidth > el.clientWidth && el.scrollLeft < el.scrollWidth - el.clientWidth - 5;
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
            setActiveCategory(categories[0].category);
        }
    }, [categories, activeCategory]);
    
    useEffect(() => {
        setCurrentPage(0);
    }, [activeCategory]);

    const activeAuthors = useMemo(() => {
        if (!activeCategory) return [];
        return categories.find(cat => cat.category === activeCategory)?.authors || [];
    }, [activeCategory, categories]);
    
    const totalPages = Math.ceil(activeAuthors.length / ITEMS_PER_PAGE);
    const paginatedAuthors = activeAuthors.slice(
        currentPage * ITEMS_PER_PAGE,
        (currentPage + 1) * ITEMS_PER_PAGE
    );

    if (isLoading) {
        return (
             <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-accent mx-auto mb-4"></div>
                <p className="text-text-secondary">Loading featured researchers...</p>
            </div>
        )
    }

    if (error) {
        return (
             <div className="text-center py-8 text-red-400 bg-surface rounded-lg border border-red-500/20">
                <p>{error}</p>
            </div>
        )
    }
    
    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-bold text-text-primary text-center">Or Browse Featured Researchers</h2>
            
            <div className="relative group">
                <button 
                    onClick={() => handleScroll('left')} 
                    aria-label="Scroll left"
                    className={`absolute -left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-surface border border-border shadow-lg transition-all opacity-0 group-hover:opacity-100 hover:bg-surface-hover disabled:opacity-0 disabled:cursor-not-allowed ${scrollState.canScrollLeft ? '' : 'opacity-0'}`}
                    disabled={!scrollState.canScrollLeft}
                >
                    <ChevronLeftIcon className="h-5 w-5"/>
                </button>
                 <div className="absolute top-0 left-0 h-full w-16 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none transition-opacity" style={{opacity: scrollState.canScrollLeft ? 1 : 0}}></div>

                <div
                    ref={scrollerRef}
                    className="flex items-center space-x-2 overflow-x-auto py-2 px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                >
                    {categories.map(category => {
                        const Icon = categoryIcons[category.category.trim()] || SparklesIcon;
                        return(
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
                    )})}
                </div>
                 <div className="absolute top-0 right-0 h-full w-16 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none transition-opacity" style={{opacity: scrollState.canScrollRight ? 1 : 0}}></div>
                <button 
                    onClick={() => handleScroll('right')} 
                    aria-label="Scroll right"
                    className={`absolute -right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-surface border border-border shadow-lg transition-all opacity-0 group-hover:opacity-100 hover:bg-surface-hover disabled:opacity-0 ${scrollState.canScrollRight ? '' : 'opacity-0'}`}
                    disabled={!scrollState.canScrollRight}
                >
                    <ChevronRightIcon className="h-5 w-5"/>
                </button>
            </div>

            <div>
                <div 
                    className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"
                >
                    {paginatedAuthors.map((author: any, index: number) => (
                         <div key={author.name} className="animate-fadeIn" style={{ animationDelay: `${index * 30}ms` }}>
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
                            onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))} 
                            disabled={currentPage === 0}
                            className="p-2 bg-surface border border-border rounded-full shadow-lg transition-all duration-300 hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed" 
                            aria-label="Previous page"
                        >
                            <ChevronLeftIcon className="h-6 w-6 text-text-primary" />
                        </button>
                        
                        <span className="text-sm font-medium text-text-secondary tabular-nums">
                            Page {currentPage + 1} / {totalPages}
                        </span>

                        <button 
                            onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))} 
                            disabled={currentPage >= totalPages - 1}
                            className="p-2 bg-surface border border-border rounded-full shadow-lg transition-all duration-300 hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed" 
                            aria-label="Next page"
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
    const { handleSearch: onSearch, handleSuggestAuthors: onSuggest, isSuggesting, suggestionError, error: searchError, suggestedAuthors } = useAuthorsView();
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
                    <h1 className="text-4xl font-bold brand-gradient-text">Author Hub</h1>
                    <p className="mt-2 text-lg text-text-secondary max-w-3xl mx-auto">Analyze a researcher's impact or discover key figures in any scientific field.</p>
                </div>
                <div className="max-w-2xl mx-auto">
                    <form onSubmit={handleSubmit} className="p-2 bg-surface border border-border rounded-lg shadow-lg">
                        <div className="flex w-full bg-background p-1 rounded-lg border border-border mb-2">
                            <button type="button" onClick={() => handleModeChange('search')} className={`w-1/2 p-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'search' ? 'bg-brand-accent text-brand-text-on-accent' : 'text-text-secondary hover:bg-surface'}`}>
                                Analyze Author
                            </button>
                            <button type="button" onClick={() => handleModeChange('suggest')} className={`w-1/2 p-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'suggest' ? 'bg-brand-accent text-brand-text-on-accent' : 'text-text-secondary hover:bg-surface'}`}>
                                Suggest Authors
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder={mode === 'search' ? "e.g., 'Jennifer Doudna'" : "e.g., 'CRISPR Gene Editing'"}
                                className="w-full bg-transparent p-2 focus:outline-none text-text-primary"
                                aria-label={mode === 'search' ? "Author name to search" : "Field of study for suggestions"}
                            />
                            <button type="submit" disabled={!query.trim() || isSuggesting} className="px-4 py-2 bg-brand-accent text-brand-text-on-accent rounded-md font-semibold disabled:opacity-50 flex items-center">
                            {mode === 'search' ? <><SearchIcon className="h-4 w-4 mr-2" />Analyze</> : <><SparklesIcon className="h-4 w-4 mr-2" />Suggest</>}
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
                        <p className="text-text-secondary">AI is discovering researchers for you...</p>
                    </div>
                 )}
                 {suggestionError && <p className="text-center text-red-400">{suggestionError}</p>}
                 {suggestedAuthors && (
                    <div className="animate-fadeIn">
                        <h2 className="text-2xl font-bold text-text-primary text-center mb-6">Key Researchers in "{query}"</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {suggestedAuthors.map(author => (
                                <AuthorCard key={author.name} name={author.name} description={author.description} onClick={() => onSearch(author.name)} />
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
    if (!clusters) return null;
    
    return (
        <div className="mt-8 animate-fadeIn pt-2">
            <h2 className="text-2xl font-bold text-text-primary text-center">Disambiguation Required</h2>
            <p className="text-center text-text-secondary mt-2">Multiple potential author profiles were found for "{authorQuery}". Please select the correct one.</p>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {clusters.map((cluster, index) => (
                    <button
                        key={index}
                        onClick={() => onSelect(cluster)}
                        className="group w-full h-full p-5 bg-surface border border-border rounded-lg text-left transition-all duration-300 hover:shadow-xl hover:border-brand-accent/50 hover:-translate-y-1.5 focus:outline-none focus:ring-2 focus:ring-brand-accent ring-offset-2 ring-offset-background"
                    >
                        <h3 className="text-lg font-bold brand-gradient-text group-hover:brand-gradient-text transition-colors duration-300">{cluster.nameVariant}</h3>
                        <div className="mt-3 space-y-2 text-sm text-text-secondary">
                            <p><strong className="text-text-primary">{cluster.publicationCount}</strong> publications</p>
                            <p><strong>Affiliation:</strong> {cluster.primaryAffiliation || 'N/A'}</p>
                            <p><strong>Top Topics:</strong> {cluster.coreTopics.join(', ')}</p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

const ProfileAccordion: React.FC<{ title: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean; }> = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const id = useId();
  const panelId = `accordion-panel-${id}`;
  const buttonId = `accordion-button-${id}`;

  return (
    <div className="border border-border rounded-lg bg-surface overflow-hidden">
      <button
        id={buttonId}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="w-full flex justify-between items-center p-4 text-left text-lg font-semibold text-text-primary hover:bg-surface-hover focus:outline-none transition-colors"
      >
        <div className="flex items-center">{title}</div>
        <ChevronDownIcon className={`h-6 w-6 transform transition-transform duration-300 text-text-secondary ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        className={`grid transition-all duration-500 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
            <div className="p-4 border-t border-border bg-background/30">
                {children}
            </div>
        </div>
      </div>
    </div>
  );
};

export const AuthorProfileView: React.FC = () => {
    const { authorProfile: profile, handleReset: onReset } = useAuthorsView();
    const { settings } = useSettings();
    
    // --- Derived State: Top Co-Authors ---
    const topCoAuthors = useMemo(() => {
        if (!profile) return [];
        const authorCounts: Record<string, number> = {};
        const mainNameParts = profile.name.toLowerCase().split(' ');
        const mainLastName = mainNameParts[mainNameParts.length - 1];

        profile.publications.forEach(pub => {
            const authors = pub.authors.split(', ');
            authors.forEach(auth => {
                const cleanAuth = auth.trim();
                // Simple filter to avoid listing the profile author themselves
                if (cleanAuth && !cleanAuth.toLowerCase().includes(mainLastName)) {
                    authorCounts[cleanAuth] = (authorCounts[cleanAuth] || 0) + 1;
                }
            });
        });

        return Object.entries(authorCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));
    }, [profile]);

    if (!profile) return null;

    const isDarkMode = settings.theme === 'dark';
    const textColor = isDarkMode ? '#7d8590' : '#57606a';
    const gridColor = isDarkMode ? 'rgba(125, 133, 144, 0.1)' : 'rgba(87, 96, 106, 0.1)';
    
    const chartData = {
        labels: Object.keys(profile.metrics.citationsPerYear).sort(),
        datasets: [
            {
                label: 'Citations per Year',
                data: Object.keys(profile.metrics.citationsPerYear).sort().map(year => profile.metrics.citationsPerYear[year]),
                backgroundColor: 'rgba(31, 111, 235, 0.6)',
                borderColor: 'rgba(31, 111, 235, 1)',
                borderWidth: 1,
            },
        ],
    };
    
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: isDarkMode ? '#0d1117' : '#ffffff',
                titleColor: isDarkMode ? '#e6edf3' : '#1f2328',
                bodyColor: isDarkMode ? '#7d8590' : '#57606a',
                borderColor: isDarkMode ? '#21262d' : '#d0d7de',
                borderWidth: 1
            }
        },
        scales: {
            x: { type: 'category' as const, ticks: { color: textColor, maxRotation: 45, minRotation: 45 }, grid: { color: gridColor } },
            y: { ticks: { color: textColor }, grid: { color: gridColor }, title: { display: true, text: 'Citations', color: textColor } }
        }
    };

    return (
        <div className="animate-fadeIn space-y-8 pt-2">
            <div className="flex items-center justify-between">
                <button onClick={onReset} className="flex items-center text-sm font-medium text-text-secondary hover:text-brand-accent transition-colors">
                    <ChevronLeftIcon className="h-4 w-4 mr-1"/>
                    Back to Search
                </button>
            </div>
            
            <div className="bg-surface p-8 rounded-xl border border-border shadow-lg">
                <div className="flex flex-col md:flex-row md:items-start gap-6 mb-8 border-b border-border pb-8">
                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center text-white text-2xl font-bold shadow-md">
                         {profile.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <h1 className="text-4xl font-bold text-text-primary">{profile.name}</h1>
                        <p className="mt-2 text-lg text-text-secondary">{profile.affiliations[0] || 'Affiliation not available'}</p>
                        {profile.orcid && <p className="text-sm font-mono text-text-secondary mt-1">ORCID: {profile.orcid}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Metrics & Concepts */}
                    <div className="lg:col-span-1 space-y-8">
                        
                        {/* Metrics Dashboard */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-background rounded-lg border border-border text-center">
                                <div className="text-3xl font-bold text-brand-accent">{profile.metrics.publicationCount}</div>
                                <div className="text-xs font-medium text-text-secondary uppercase tracking-wide mt-1">Publications</div>
                            </div>
                             <div className="p-4 bg-background rounded-lg border border-border text-center">
                                <div className="text-3xl font-bold text-brand-accent">{profile.metrics.hIndex ?? 'N/A'}</div>
                                <div className="text-xs font-medium text-text-secondary uppercase tracking-wide mt-1">Est. H-Index</div>
                            </div>
                             <div className="p-4 bg-background rounded-lg border border-border text-center">
                                <div className="text-3xl font-bold text-accent-cyan">{profile.metrics.publicationsAsFirstAuthor}</div>
                                <div className="text-xs font-medium text-text-secondary uppercase tracking-wide mt-1">First Author</div>
                            </div>
                             <div className="p-4 bg-background rounded-lg border border-border text-center">
                                <div className="text-3xl font-bold text-accent-magenta">{profile.metrics.publicationsAsLastAuthor}</div>
                                <div className="text-xs font-medium text-text-secondary uppercase tracking-wide mt-1">Last Author</div>
                            </div>
                        </div>

                        {/* Core Concepts */}
                        <div>
                             <h3 className="text-lg font-bold text-text-primary mb-4">Core Concepts</h3>
                             <div className="space-y-3">
                                {profile.coreConcepts.map(({ concept, frequency }) => (
                                    <Tooltip key={concept} content={`${frequency} publications mention this concept`}>
                                        <div className="group cursor-default">
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-text-secondary font-medium group-hover:text-brand-accent transition-colors">{concept}</span>
                                                <span className="text-text-secondary text-xs">{frequency}</span>
                                            </div>
                                            <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                                                <div className="h-full bg-brand-accent/70 group-hover:bg-brand-accent transition-colors rounded-full" style={{ width: `${(frequency / profile.metrics.publicationCount) * 100}%` }}></div>
                                            </div>
                                        </div>
                                    </Tooltip>
                                ))}
                             </div>
                        </div>
                        
                        {/* Top Co-Authors (Derived) */}
                        {topCoAuthors.length > 0 && (
                            <div>
                                <h3 className="text-lg font-bold text-text-primary mb-4">Top Collaborators</h3>
                                <div className="flex flex-wrap gap-2">
                                    {topCoAuthors.map(ca => (
                                        <span key={ca.name} className="px-3 py-1 rounded-full bg-surface-hover border border-border text-xs font-medium text-text-primary" title={`${ca.count} co-authored papers`}>
                                            {ca.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Narrative & Timeline */}
                    <div className="lg:col-span-2 space-y-8">
                        <div>
                            <h3 className="text-xl font-bold text-text-primary mb-4">Career Synthesis</h3>
                            <div className="prose prose-sm prose-invert max-w-none text-text-secondary/90 leading-relaxed bg-background p-6 rounded-lg border border-border shadow-inner" dangerouslySetInnerHTML={{ __html: secureMarkdownToHtml(profile.careerSummary) }} />
                        </div>

                        <div>
                            <h3 className="text-xl font-bold text-text-primary mb-4">Citation Impact Timeline</h3>
                            <div className="h-64 bg-background p-4 rounded-lg border border-border">
                                 <Bar options={chartOptions as any} data={chartData} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-10">
                    <ProfileAccordion title={<div className="flex items-center gap-2 font-bold"><DocumentIcon className="h-5 w-5 text-brand-accent"/><span>Full Publication List ({profile.publications.length})</span></div>}>
                         <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin">
                            {profile.publications.sort((a,b) => parseInt(b.pubYear) - parseInt(a.pubYear)).map(pub => (
                                <a key={pub.pmid} href={`https://pubmed.ncbi.nlm.nih.gov/${pub.pmid}/`} target="_blank" rel="noopener noreferrer" className="block p-4 bg-surface border border-border rounded-lg hover:bg-surface-hover hover:border-brand-accent/50 transition-all group">
                                    <div className="flex justify-between items-start">
                                        <p className="font-semibold text-sm text-text-primary group-hover:text-brand-accent">{pub.title}</p>
                                        <span className="text-xs font-mono text-text-secondary bg-background px-2 py-0.5 rounded border border-border ml-2 shrink-0">{pub.pubYear}</span>
                                    </div>
                                    <p className="text-xs text-text-secondary mt-2 italic">{pub.journal}</p>
                                </a>
                            ))}
                        </div>
                    </ProfileAccordion>
                </div>
            </div>
        </div>
    );
};
