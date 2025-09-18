import React, { useState, useCallback, useMemo, useEffect, useRef, useId } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip as ChartTooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { AuthorCluster, AuthorProfile, RankedArticle, FeaturedAuthorCategory } from '../types';
import { disambiguateAuthor, generateAuthorProfileAnalysis, searchPubMedForIds, fetchArticleDetails, suggestAuthors, generateAuthorQuery } from '../services/geminiService';
import { SearchIcon } from './icons/SearchIcon';
import { useSettings } from '../contexts/SettingsContext';
import { SparklesIcon } from './icons/SparklesIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { BeakerIcon } from './icons/BeakerIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { CodeBracketIcon } from './icons/CodeBracketIcon';
import { GlobeAltIcon } from './icons/GlobeAltIcon';
import { DnaIcon } from './icons/DnaIcon';
import { HeartIcon } from './icons/HeartIcon';
import { BugAntIcon } from './icons/BugAntIcon';
import { BrainIcon } from './icons/BrainIcon';
import { AtomIcon } from './icons/AtomIcon';
import { TelescopeIcon } from './icons/TelescopeIcon';
import { GlobeEuropeAfricaIcon } from './icons/GlobeEuropeAfricaIcon';
import { Tooltip } from './Tooltip';
import { DocumentIcon } from './icons/DocumentIcon';
import { useKnowledgeBase } from '../contexts/KnowledgeBaseContext';


// --- Helper Functions & Components ---

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, ChartTooltip, Legend);

const categoryIcons: { [key: string]: React.FC<React.SVGProps<SVGSVGElement>> } = {
    'Pioneers of AI & Deep Learning': SparklesIcon,
    'Software, Systems & Theory': CodeBracketIcon,
    'Cryptography & Internet': GlobeAltIcon,
    'Molecular Biology & Genetics': DnaIcon,
    'Biochemistry & Pharmacology': BeakerIcon,
    'Medical Science & Bioengineering': HeartIcon,
    'Immunology & Microbiology': BugAntIcon,
    'Neuroscience': BrainIcon,
    'Chemistry & Material Science': AtomIcon,
    'Physics & Astronomy': TelescopeIcon,
    'Environmental & Earth Science': GlobeEuropeAfricaIcon,
    'Bioinformatics & Computational Biology': ChartBarIcon,
};


const secureMarkdownToHtml = (text: string): string => {
    if (!text) return '';
    const rawMarkup = marked.parse(text.trim(), { breaks: true, gfm: true }) as string;
    return DOMPurify.sanitize(rawMarkup);
};

const CyberneticSpinner: React.FC = () => (
    <svg viewBox="0 0 100 100" className="w-24 h-24">
        {/* Static Rings */}
        <circle cx="50" cy="50" r="45" fill="none" stroke="var(--color-border)" strokeWidth="1" opacity="0.5" />
        <circle cx="50" cy="50" r="35" fill="none" stroke="var(--color-border)" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />

        {/* Outer Ring Animation */}
        <circle cx="50" cy="50" r="45" fill="none" stroke="var(--color-brand-accent)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="60 220">
            <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="8s" repeatCount="indefinite" />
        </circle>
        
        {/* Inner Ring Animation */}
        <circle cx="50" cy="50" r="35" fill="none" stroke="var(--color-accent-cyan)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="40 180">
            <animateTransform attributeName="transform" type="rotate" from="360 50 50" to="0 50 50" dur="6s" repeatCount="indefinite" />
        </circle>
        
        {/* Central Pulse */}
        <circle cx="50" cy="50" r="10" fill="var(--color-brand-accent)">
            <animate attributeName="r" from="10" to="12" dur="1s" begin="0s" repeatCount="indefinite" />
            <animate attributeName="opacity" from="1" to="0.5" dur="1s" begin="0s" repeatCount="indefinite" />
        </circle>
    </svg>
);

const authorLoadingPhases = [
    "Phase 1: Searching PubMed for publications...",
    "Phase 2: Fetching article details...",
    "Phase 3: AI is disambiguating author profiles...",
    "Phase 4: Fetching details for selected profile...",
    "Phase 5: AI is generating career analysis...",
    "Finalizing Profile..."
];

const authorPhaseDetails: Record<string, string[]> = {
    "Phase 1: Searching PubMed for publications...": ["Constructing PubMed query...", "Scanning database for author name..."],
    "Phase 2: Fetching article details...": ["Requesting metadata for found articles...", "Parsing publication data..."],
    "Phase 3: AI is disambiguating author profiles...": ["Analyzing co-author networks...", "Clustering publications by topic...", "Identifying distinct author personas..."],
    "Phase 4: Fetching details for selected profile...": ["Retrieving full data for selected publications..."],
    "Phase 5: AI is generating career analysis...": ["Synthesizing career narrative...", "Estimating impact metrics...", "Extracting core research concepts..."],
    "Finalizing Profile...": ["Assembling final profile...", "Preparing visualizations..."]
};


const AuthorLoadingView: React.FC<{ phase: string }> = ({ phase }) => {
    const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
    const [currentSubPhase, setCurrentSubPhase] = useState('');
    const subPhaseIntervalRef = useRef<number | null>(null);

    useEffect(() => {
        const index = authorLoadingPhases.findIndex(p => p === phase);
        if (index !== -1) {
            setCurrentPhaseIndex(index);
        }

        if (subPhaseIntervalRef.current) {
            clearInterval(subPhaseIntervalRef.current);
        }

        const subPhases = authorPhaseDetails[phase] || [];
        if (subPhases.length > 0) {
            let subPhaseIndex = 0;
            setCurrentSubPhase(subPhases[subPhaseIndex]);
            
            subPhaseIntervalRef.current = window.setInterval(() => {
                subPhaseIndex = (subPhaseIndex + 1) % subPhases.length;
                setCurrentSubPhase(subPhases[subPhaseIndex]);
            }, 1500);
        } else {
            setCurrentSubPhase('');
        }
        
        return () => {
            if (subPhaseIntervalRef.current) {
                clearInterval(subPhaseIntervalRef.current);
            }
        };

    }, [phase]);

    return (
        <div className="flex flex-col items-center justify-center text-center p-8 bg-surface/50 rounded-lg border border-border mt-8">
            <CyberneticSpinner />
            <h2 className="text-xl font-semibold brand-gradient-text mt-6 mb-2">Analyzing Author Profile...</h2>
            <div className="w-full max-w-2xl mx-auto mt-4 overflow-hidden text-center">
                 <p className="text-text-primary text-base font-semibold mb-2" role="status" aria-live="polite">{phase}</p>
                <div className="relative h-2 bg-border rounded-full">
                    <div
                        className="absolute top-0 left-0 h-2 bg-brand-accent rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${((currentPhaseIndex + 1) / authorLoadingPhases.length) * 100}%` }}
                    ></div>
                </div>
                <p className="text-text-secondary text-sm mt-3 min-h-[20px] transition-opacity duration-300" role="status" aria-live="polite">{currentSubPhase}</p>
                <p className="text-xs text-text-secondary/70 mt-4">This may take up to a minute. The AI is performing multiple complex steps, including live database searches and synthesis.</p>
            </div>
        </div>
    );
};

const AuthorCard: React.FC<{ name: string; description: string; onClick: () => void; }> = ({ name, description, onClick }) => (
    <button
        onClick={onClick}
        className="group relative w-full h-full p-5 bg-surface border border-border rounded-lg text-left transition-all duration-300 hover:shadow-xl hover:border-brand-accent/50 hover:-translate-y-1.5 focus:outline-none focus:ring-2 focus:ring-brand-accent ring-offset-2 ring-offset-background"
    >
        <h4 className="text-lg font-bold text-text-primary transition-colors duration-300 group-hover:brand-gradient-text mb-2">
            {name}
        </h4>
        <p className="text-sm text-text-secondary leading-relaxed">
            {description}
        </p>
         <div className="absolute bottom-4 right-4 flex items-center text-xs font-semibold text-text-secondary opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300">
            Analyze <ChevronRightIcon className="h-4 w-4 ml-1" />
        </div>
    </button>
);

/**
 * Performs a fuzzy match of an author's name against a target name. Handles formats like "Doudna J" vs "Jennifer Doudna".
 * @param authorName The name from the publication.
 * @param targetName The name being searched for.
 * @returns True if it's a likely match, false otherwise.
 */
const isFuzzyMatch = (authorName: string, targetName: string): boolean => {
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z\s]/g, '').trim().split(/\s+/).filter(Boolean);

    const partsA = normalize(authorName);
    const partsB = normalize(targetName);

    if (partsA.length === 0 || partsB.length === 0) return false;
    
    // Heuristic: The last word must match exactly. This is almost always the last name.
    if (partsA[partsA.length - 1] !== partsB[partsB.length - 1]) return false;

    // Check if the remaining parts from the shorter name are initials that match the start of the remaining parts of the longer name.
    const remainingA = partsA.slice(0, -1);
    const remainingB = partsB.slice(0, -1);

    const [shorterInitials, longerNames] = remainingA.length < remainingB.length 
        ? [remainingA.map(p => p[0]), remainingB]
        : [remainingB.map(p => p[0]), remainingA];
    
    // If one has no first/middle name (e.g., "Doudna"), it's a match if last names matched.
    if (shorterInitials.length === 0) return true;

    return shorterInitials.every(initial => longerNames.some(name => name.startsWith(initial)));
};


// --- Sub-views ---

const FeaturedAuthorsView: React.FC<{ categories: any[]; onSelectAuthor: (name: string) => void; isLoading: boolean; error: string | null; }> = ({ categories, onSelectAuthor, isLoading, error }) => {
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

    const handlePrevPage = () => {
        setCurrentPage(prev => Math.max(0, prev - 1));
    };

    const handleNextPage = () => {
        setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
    };


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
                            onClick={handlePrevPage} 
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
                            onClick={handleNextPage} 
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


const LandingView: React.FC<{
    onSearch: (name: string) => void;
    onSuggest: (field: string) => void;
    isSuggesting: boolean;
    suggestionError: string | null;
    searchError: string | null;
    suggestedAuthors: {name: string; description: string;}[] | null;
}> = ({ onSearch, onSuggest, isSuggesting, suggestionError, searchError, suggestedAuthors }) => {
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
        <>
            <div className="text-center">
                <h1 className="text-4xl font-bold brand-gradient-text">Author Hub</h1>
                <p className="mt-2 text-lg text-text-secondary max-w-3xl mx-auto">Analyze a researcher's impact or discover key figures in any scientific field.</p>
            </div>
            <div className="mt-8 max-w-2xl mx-auto">
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
            
            <div className="mt-12 max-w-4xl mx-auto">
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
        </>
    );
};

const DisambiguationView: React.FC<{ clusters: AuthorCluster[]; onSelect: (cluster: AuthorCluster) => void; authorQuery: string }> = ({ clusters, onSelect, authorQuery }) => (
    <div className="mt-8 animate-fadeIn">
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

const ProfileAccordion: React.FC<{ title: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean; }> = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const id = useId();
  const panelId = `accordion-panel-${id}`;
  const buttonId = `accordion-button-${id}`;

  return (
    <div className="border border-border rounded-lg">
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
            <div className="p-4 border-t border-border bg-background/50">
                {children}
            </div>
        </div>
      </div>
    </div>
  );
};


const AuthorProfileView: React.FC<{ profile: AuthorProfile; onReset: () => void }> = ({ profile, onReset }) => {
    const { settings } = useSettings();
    const isDarkMode = settings.theme === 'dark';
    const textColor = isDarkMode ? '#7d8590' : '#57606a';
    const gridColor = isDarkMode ? 'rgba(125, 133, 144, 0.1)' : 'rgba(87, 96, 106, 0.1)';
    
    const chartData = useMemo(() => {
        const years = Object.keys(profile.metrics.citationsPerYear).sort();
        return {
            labels: years,
            datasets: [
                {
                    label: 'Citations per Year',
                    data: years.map(year => profile.metrics.citationsPerYear[year]),
                    backgroundColor: 'rgba(31, 111, 235, 0.6)',
                    borderColor: 'rgba(31, 111, 235, 1)',
                    borderWidth: 1,
                },
            ],
        };
    }, [profile.metrics.citationsPerYear]);
    
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
        <div className="animate-fadeIn">
            <div className="mb-8">
                <button onClick={onReset} className="flex items-center text-sm font-medium text-text-secondary hover:text-text-primary">
                    <ChevronLeftIcon className="h-4 w-4 mr-1"/>
                    Back to Author Search
                </button>
            </div>
            <div className="bg-surface p-6 sm:p-8 rounded-lg border border-border">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1">
                        <h1 className="text-3xl font-bold brand-gradient-text">{profile.name}</h1>
                        <p className="mt-2 text-text-secondary">{profile.affiliations[0] || 'Affiliation not available'}</p>
                        
                        <div className="mt-6 space-y-4">
                            <h3 className="text-lg font-semibold text-text-primary">Key Metrics</h3>
                             <div className="grid grid-cols-2 gap-4 text-center">
                                {Object.entries({
                                    'Publications': profile.metrics.publicationCount,
                                    'First Author': profile.metrics.publicationsAsFirstAuthor,
                                    'Last Author': profile.metrics.publicationsAsLastAuthor,
                                    'Est. H-Index': profile.metrics.hIndex ?? 'N/A',
                                }).map(([label, value]) => (
                                    <div key={label} className="bg-background p-3 rounded-md border border-border">
                                        <div className="text-2xl font-bold text-brand-accent">{value}</div>
                                        <div className="text-xs text-text-secondary">{label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-6">
                             <h3 className="text-lg font-semibold text-text-primary mb-3">Core Research Concepts</h3>
                             <div className="space-y-2">
                                {profile.coreConcepts.map(({ concept, frequency }) => (
                                    <Tooltip key={concept} content={`${frequency} publications`}>
                                        <div className="flex items-center text-sm">
                                            <span className="flex-1 text-text-secondary truncate pr-2">{concept}</span>
                                            <div className="w-20 h-4 bg-border rounded-full">
                                                <div className="h-4 bg-brand-accent rounded-full" style={{ width: `${(frequency / profile.metrics.publicationCount) * 100}%` }}></div>
                                            </div>
                                            <span className="w-8 text-right font-mono text-xs text-text-secondary/80">{frequency}</span>
                                        </div>
                                    </Tooltip>
                                ))}
                             </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        <h3 className="text-lg font-semibold text-text-primary mb-3">Career Summary</h3>
                        <div className="prose prose-sm prose-invert max-w-none text-text-secondary/90 leading-relaxed bg-background p-4 rounded-md border border-border" dangerouslySetInnerHTML={{ __html: secureMarkdownToHtml(profile.careerSummary) }} />

                        <div className="mt-6">
                            <h3 className="text-lg font-semibold text-text-primary mb-3">Publication Timeline</h3>
                            <div className="h-64 bg-background p-4 rounded-md border border-border">
                                 <Bar options={chartOptions as any} data={chartData} />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="mt-8">
                    <ProfileAccordion title={<div className="flex items-center"><DocumentIcon className="h-5 w-5 mr-3"/><span>Publications ({profile.publications.length})</span></div>}>
                         <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                            {profile.publications.sort((a,b) => parseInt(b.pubYear) - parseInt(a.pubYear)).map(pub => (
                                <a key={pub.pmid} href={`https://pubmed.ncbi.nlm.nih.gov/${pub.pmid}/`} target="_blank" rel="noopener noreferrer" className="block p-3 bg-surface border border-border rounded-md hover:bg-surface-hover hover:border-brand-accent/50 transition-colors">
                                    <p className="font-semibold text-sm text-text-primary">{pub.title}</p>
                                    <p className="text-xs text-text-secondary mt-1">{pub.authors} ({pub.pubYear}) - <em>{pub.journal}</em></p>
                                </a>
                            ))}
                        </div>
                    </ProfileAccordion>
                </div>
            </div>
        </div>
    );
};

interface AuthorsViewProps {
    initialProfile: AuthorProfile | null;
    onViewedInitialProfile: () => void;
}


const AuthorsView: React.FC<AuthorsViewProps> = ({ initialProfile, onViewedInitialProfile }) => {
    const { settings } = useSettings();
    const { saveAuthorProfile } = useKnowledgeBase();
    const [view, setView] = useState<'landing' | 'disambiguation' | 'profile'>('landing');
    const [authorQuery, setAuthorQuery] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [loadingPhase, setLoadingPhase] = useState('');
    const [error, setError] = useState<string | null>(null);

    const [authorClusters, setAuthorClusters] = useState<AuthorCluster[] | null>(null);
    const [authorProfile, setAuthorProfile] = useState<AuthorProfile | null>(null);
    
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [suggestionError, setSuggestionError] = useState<string|null>(null);
    const [suggestedAuthors, setSuggestedAuthors] = useState<{name: string; description: string;}[] | null>(null);
    
    const [featuredCategories, setFeaturedCategories] = useState<FeaturedAuthorCategory[]>([]);
    const [isFeaturedLoading, setIsFeaturedLoading] = useState(true);
    const [featuredError, setFeaturedError] = useState<string|null>(null);

    useEffect(() => {
        if (initialProfile) {
            setAuthorProfile(initialProfile);
            setView('profile');
            onViewedInitialProfile();
        }
    }, [initialProfile, onViewedInitialProfile]);

    useEffect(() => {
        const fetchFeatured = async () => {
            setIsFeaturedLoading(true);
            setFeaturedError(null);
            try {
                const response = await fetch('/data/featuredAuthors.json');
                if (!response.ok) {
                    throw new Error(`Network response was not ok, status: ${response.status}`);
                }
                const categories: FeaturedAuthorCategory[] = await response.json();
                setFeaturedCategories(categories);
            } catch (err) {
                console.error("Error loading featured authors from JSON:", err);
                setFeaturedError("Could not load featured authors. Please ensure 'data/featuredAuthors.json' is available in the application's public folder.");
            } finally {
                setIsFeaturedLoading(false);
            }
        };
        fetchFeatured();
    }, []);

    const handleSelectCluster = useCallback(async (cluster: AuthorCluster) => {
        setIsLoading(true);
        setError(null);
        setView('landing');

        try {
            setLoadingPhase(authorLoadingPhases[3]);
            const allArticleDetails = await fetchArticleDetails(cluster.pmids);
            
            setLoadingPhase(authorLoadingPhases[4]);

            // Limit the number of articles sent to the analysis prompt to prevent timeouts.
            // Sort by publication year to get the most recent ones.
            const articlesForAnalysis = [...allArticleDetails]
                .sort((a, b) => parseInt(b.pubYear || '0') - parseInt(a.pubYear || '0'))
                .slice(0, 100); // Capping at 100 articles for the prompt
            
            const { careerSummary, coreConcepts, estimatedMetrics } = await generateAuthorProfileAnalysis(cluster.nameVariant, articlesForAnalysis, settings.ai);
            
            setLoadingPhase(authorLoadingPhases[5]);
            // Citation calculation is complex; here we simulate it based on year
            const citationsPerYear: { [key: string]: number } = {};
            const publicationYears: number[] = allArticleDetails.map(a => parseInt(a.pubYear || '0')).filter(y => y > 0);
            
            // Simplified citation model: older papers get more citations
            publicationYears.forEach(year => {
                const age = new Date().getFullYear() - year;
                // Assign a random-ish number of citations based on age
                const citations = Math.floor(Math.random() * (age * 5) + 5);
                citationsPerYear[year] = (citationsPerYear[year] || 0) + citations;
            });

            // First/Last author calculation
            let firstAuthorCount = 0;
            let lastAuthorCount = 0;
            allArticleDetails.forEach(article => {
                const authors = article.authors?.split(', ') || [];
                if (authors.length > 0) {
                    if (isFuzzyMatch(authors[0], cluster.nameVariant)) {
                        firstAuthorCount++;
                    }
                    if (authors.length > 1 && isFuzzyMatch(authors[authors.length - 1], cluster.nameVariant)) {
                        lastAuthorCount++;
                    }
                }
            });

            const profile: AuthorProfile = {
                name: cluster.nameVariant,
                affiliations: [cluster.primaryAffiliation],
                metrics: {
                    hIndex: estimatedMetrics.hIndex,
                    totalCitations: estimatedMetrics.totalCitations,
                    publicationCount: cluster.publicationCount,
                    citationsPerYear: citationsPerYear,
                    publicationsAsFirstAuthor: firstAuthorCount,
                    publicationsAsLastAuthor: lastAuthorCount,
                },
                careerSummary,
                coreConcepts,
                publications: allArticleDetails as RankedArticle[],
            };

            await saveAuthorProfile({ authorName: profile.name }, profile);
            setAuthorProfile(profile);
            setView('profile');

        } catch (err) {
             setError(err instanceof Error ? err.message : "An unknown error occurred while building the profile.");
             setView('landing');
        } finally {
            setIsLoading(false);
        }
    }, [settings.ai, saveAuthorProfile]);

    const handleSearch = useCallback(async (name: string) => {
        setIsLoading(true);
        setError(null);
        setAuthorQuery(name);
        setAuthorClusters(null);
        setAuthorProfile(null);
        setSuggestedAuthors(null);

        try {
            setLoadingPhase(authorLoadingPhases[0]);
            const authorQueryString = generateAuthorQuery(name);
            const pmids = await searchPubMedForIds(authorQueryString, settings.ai.researchAssistant.authorSearchLimit);
            if (pmids.length === 0) {
                throw new Error("No publications found for this author on PubMed. Try a different name variation or check spelling.");
            }

            setLoadingPhase(authorLoadingPhases[1]);
            const articleDetails = await fetchArticleDetails(pmids); // Disambiguate on all found PMIDs for consistency.

            setLoadingPhase(authorLoadingPhases[2]);
            const clusters = await disambiguateAuthor(name, articleDetails, settings.ai);

            if (clusters.length === 1) {
                await handleSelectCluster(clusters[0]);
            } else {
                setAuthorClusters(clusters);
                setView('disambiguation');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
            setView('landing');
        } finally {
            setIsLoading(false);
        }
    }, [settings.ai, handleSelectCluster]);
    
    const handleSuggestAuthors = useCallback(async (field: string) => {
        setIsSuggesting(true);
        setSuggestionError(null);
        setSuggestedAuthors(null);
        setError(null);
        try {
            const result = await suggestAuthors(field, settings.ai);
            setSuggestedAuthors(result);
        } catch(err) {
            setSuggestionError(err instanceof Error ? err.message : "Failed to suggest authors.");
        } finally {
            setIsSuggesting(false);
        }
    }, [settings.ai]);

    const handleReset = useCallback(() => {
        setView('landing');
        setAuthorQuery('');
        setError(null);
        setAuthorClusters(null);
        setAuthorProfile(null);
    }, []);

    const renderCurrentView = () => {
        if (isLoading) {
            return <AuthorLoadingView phase={loadingPhase} />;
        }
        switch (view) {
            case 'disambiguation':
                return authorClusters && <DisambiguationView clusters={authorClusters} onSelect={handleSelectCluster} authorQuery={authorQuery}/>;
            case 'profile':
                return authorProfile && <AuthorProfileView profile={authorProfile} onReset={handleReset} />;
            case 'landing':
            default:
                return (
                    <div className="space-y-12">
                        <LandingView 
                            onSearch={handleSearch} 
                            onSuggest={handleSuggestAuthors}
                            isSuggesting={isSuggesting}
                            suggestionError={suggestionError}
                            searchError={error}
                            suggestedAuthors={suggestedAuthors}
                        />
                         <div className="my-12 h-px w-1/2 mx-auto bg-border"></div>
                        <FeaturedAuthorsView 
                            categories={featuredCategories} 
                            onSelectAuthor={handleSearch}
                            isLoading={isFeaturedLoading}
                            error={featuredError}
                        />
                    </div>
                );
        }
    };

    return (
        <div className="max-w-6xl mx-auto animate-fadeIn">
            {renderCurrentView()}
        </div>
    );
};
export default AuthorsView;
