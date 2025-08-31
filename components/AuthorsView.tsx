import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip as ChartTooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { AuthorCluster, AuthorProfile, RankedArticle } from '../types';
import { disambiguateAuthor, generateAuthorProfileAnalysis, searchPubMedForIds, fetchArticleDetails, suggestAuthors } from '../services/geminiService';
import { SearchIcon } from './icons/SearchIcon';
import { useSettings } from '../contexts/SettingsContext';
import { SparklesIcon } from './icons/SparklesIcon';
import { UnlockIcon } from './icons/UnlockIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { XIcon } from './icons/XIcon';
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


// --- Helper Functions & Components ---

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
        className="group w-full h-full p-5 bg-surface border border-border rounded-lg text-left transition-all duration-300 hover:shadow-xl hover:border-brand-accent/50 hover:-translate-y-1.5 focus:outline-none focus:ring-2 focus:ring-brand-accent ring-offset-2 ring-offset-background"
    >
        <h4 className="text-lg font-bold text-text-primary transition-colors duration-300 group-hover:brand-gradient-text mb-2">
            {name}
        </h4>
        <p className="text-sm text-text-secondary leading-relaxed">
            {description}
        </p>
    </button>
);


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
                <p className="text-text-secondary">Loading Featured Researchers...</p>
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
        <h2 className="text-2xl font-bold text-text-primary text-center">Confirm Author Identity</h2>
        <p className="text-center text-text-secondary mt-1">We found multiple potential author profiles for "{authorQuery}". Please select the correct one.</p>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {clusters.map((cluster, index) => (
                <button key={index} onClick={() => onSelect(cluster)} className="p-5 bg-surface border border-border rounded-lg text-left transition-all hover:shadow-lg hover:border-brand-accent/50 focus:outline-none focus:ring-2 focus:ring-brand-accent">
                    <h3 className="font-bold text-lg text-brand-accent">{cluster.nameVariant}</h3>
                    <p className="text-sm font-medium text-text-primary mt-1">{cluster.publicationCount} publications found</p>
                    <div className="mt-4 text-xs space-y-2 text-text-secondary">
                        <p><strong className="text-text-primary">Affiliation:</strong> {cluster.primaryAffiliation || 'N/A'}</p>
                        <p><strong className="text-text-primary">Top Co-Authors:</strong> {cluster.topCoAuthors.join(', ')}</p>
                        <p><strong className="text-text-primary">Core Topics:</strong> {cluster.coreTopics.join(', ')}</p>
                    </div>
                </button>
            ))}
        </div>
    </div>
);


// --- ProfileView Sub-components ---

const AuthorProfileHeader: React.FC<{ profile: AuthorProfile; onReset: () => void; }> = ({ profile, onReset }) => (
    <div className="flex justify-between items-start">
        <div>
            <h1 className="text-4xl font-bold brand-gradient-text">{profile.name}</h1>
            <p className="mt-1 text-lg text-text-secondary">{profile.affiliations.join(', ')}</p>
        </div>
        <button onClick={onReset} className="inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-md shadow-sm text-text-primary bg-surface hover:bg-surface-hover">
            <SearchIcon className="h-4 w-4 mr-2" />
            New Author Search
        </button>
    </div>
);

const AuthorMetricsDisplay: React.FC<{ metrics: AuthorProfile['metrics']; }> = ({ metrics }) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div className="bg-surface p-4 rounded-lg border border-border">
            <p className="text-2xl font-bold text-brand-accent">{metrics.publicationCount}</p>
            <p className="text-xs text-text-secondary">Publications</p>
        </div>
        <div className="bg-surface p-4 rounded-lg border border-border">
            <Tooltip content="This is an AI-generated estimation based on available data and may not be fully accurate.">
                <div className="cursor-help">
                    <p className="text-2xl font-bold text-brand-accent">{metrics.totalCitations ?? 'N/A'}</p>
                    <p className="text-xs text-text-secondary">Total Citations (AI Est.)</p>
                </div>
            </Tooltip>
        </div>
        <div className="bg-surface p-4 rounded-lg border border-border">
            <Tooltip content="This is an AI-generated estimation based on available data and may not be fully accurate.">
                <div className="cursor-help">
                    <p className="text-2xl font-bold text-brand-accent">{metrics.hIndex ?? 'N/A'}</p>
                    <p className="text-xs text-text-secondary">h-index (AI Est.)</p>
                </div>
            </Tooltip>
        </div>
        <div className="bg-surface p-4 rounded-lg border border-border">
            <p className="text-2xl font-bold text-brand-accent">{metrics.publicationsAsFirstAuthor}/{metrics.publicationsAsLastAuthor}</p>
            <p className="text-xs text-text-secondary">First/Last Author</p>
        </div>
    </div>
);


const AICareerSummary: React.FC<{ summary: string; }> = ({ summary }) => (
    <div className="bg-surface p-4 rounded-lg border border-border">
        <h3 className="text-lg font-semibold text-text-primary mb-2 flex items-center"><SparklesIcon className="h-5 w-5 mr-2 text-brand-accent"/>AI Career Summary</h3>
        <div className="prose prose-sm prose-invert max-w-none text-text-secondary/90 leading-relaxed" dangerouslySetInnerHTML={{ __html: secureMarkdownToHtml(summary) }} />
    </div>
);

const PublicationTimeline: React.FC<{ publications: RankedArticle[]; settings: any; }> = ({ publications, settings }) => {
    const isDarkMode = settings.theme === 'dark';
    const textColor = isDarkMode ? '#7d8590' : '#57606a';
    const gridColor = isDarkMode ? 'rgba(125, 133, 144, 0.1)' : 'rgba(87, 96, 106, 0.1)';

    const timelineData = useMemo(() => {
        const pubsPerYear: { [year: string]: number } = {};
        publications.forEach(p => {
            pubsPerYear[p.pubYear] = (pubsPerYear[p.pubYear] || 0) + 1;
        });
        const sortedYears = Object.keys(pubsPerYear).sort((a,b) => parseInt(a) - parseInt(b));
        return {
            labels: sortedYears,
            datasets: [{
                label: 'Publications per Year',
                data: sortedYears.map(year => pubsPerYear[year]),
                backgroundColor: 'rgba(31, 111, 235, 0.6)'
            }]
        }
    }, [publications]);
    
    return (
        <div className="lg:col-span-2 bg-surface p-4 rounded-lg border border-border">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Publication Timeline</h3>
            <div className="h-64">
                <Bar data={timelineData} options={{ 
                    responsive: true, 
                    maintainAspectRatio: false, 
                    scales: { 
                        x: { 
                            type: 'category',
                            ticks: { color: textColor }, 
                            grid: { color: gridColor } 
                        }, 
                        y: { 
                            title: { display: true, text: 'Number of Publications' },
                            ticks: { color: textColor, stepSize: 1 }, 
                            grid: { color: gridColor } 
                        } 
                    } 
                }} />
            </div>
        </div>
    );
};

const ConceptItem: React.FC<{
    concept: AuthorProfile['coreConcepts'][0];
    publications: RankedArticle[];
    isActive: boolean;
    onToggle: () => void;
}> = ({ concept, publications, isActive, onToggle }) => {

    const relevantPublications = useMemo(() => {
        const lowercasedConcept = concept.concept.toLowerCase();
        // A publication is relevant if the concept appears in title, summary, or keywords
        return publications.filter(p =>
            p.title.toLowerCase().includes(lowercasedConcept) ||
            (p.summary && p.summary.toLowerCase().includes(lowercasedConcept)) ||
            (p.keywords && p.keywords.some(k => k.toLowerCase().includes(lowercasedConcept)))
        );
    }, [concept.concept, publications]);

    return (
        <div className="py-2">
            <button
                onClick={onToggle}
                className={`w-full flex justify-between items-center text-left p-2 rounded-md transition-colors ${isActive ? 'bg-brand-accent/10' : 'hover:bg-surface-hover'}`}
                aria-expanded={isActive}
                disabled={relevantPublications.length === 0}
            >
                <span className={`font-medium ${relevantPublications.length > 0 ? 'text-text-primary' : 'text-text-secondary opacity-60'}`}>
                    {concept.concept} 
                    <span className="text-xs text-text-secondary ml-1">({relevantPublications.length})</span>
                </span>
                {relevantPublications.length > 0 && (
                    <ChevronDownIcon className={`h-5 w-5 transform transition-transform text-text-secondary ${isActive ? 'rotate-180' : ''}`} />
                )}
            </button>
            {isActive && (
                <div className="mt-3 pl-6 border-l-2 border-border space-y-2 animate-fadeIn" style={{ animationDuration: '300ms' }}>
                    <p className="text-xs text-text-secondary italic mb-2">Top 5 related publications shown below. The main list is also filtered.</p>
                    {relevantPublications.slice(0, 5).map(pub => {
                        const articleLink = pub.pmcId ? `https://www.ncbi.nlm.nih.gov/pmc/articles/${pub.pmcId}/` : `https://pubmed.ncbi.nlm.nih.gov/${pub.pmid}/`;
                        return (
                            <a key={pub.pmid} href={articleLink} target="_blank" rel="noopener noreferrer" className="block text-xs text-text-secondary hover:text-brand-accent hover:underline">
                                {pub.title} ({pub.pubYear})
                            </a>
                        );
                    })}
                     {relevantPublications.length > 5 && <p className="text-xs text-text-secondary">...and {relevantPublications.length - 5} more in the list below.</p>}
                </div>
            )}
        </div>
    );
};

const CoreConcepts: React.FC<{
    concepts: AuthorProfile['coreConcepts'];
    publications: RankedArticle[];
    activeConcept: string | null;
    setActiveConcept: (concept: string | null) => void;
}> = ({ concepts, publications, activeConcept, setActiveConcept }) => {
    const handleToggle = (conceptName: string) => {
        setActiveConcept(activeConcept === conceptName ? null : conceptName);
    };
    return (
        <div className="lg:col-span-1 bg-surface p-4 rounded-lg border border-border">
            <h3 className="text-lg font-semibold text-text-primary mb-2">Core Research Concepts</h3>
            <p className="text-xs text-text-secondary mb-2">Click a concept to see related publications and filter the main list.</p>
            <div className="divide-y divide-border">
                {concepts.slice(0, 15).map(c => (
                     <ConceptItem 
                        key={c.concept} 
                        concept={c} 
                        publications={publications}
                        isActive={activeConcept === c.concept}
                        onToggle={() => handleToggle(c.concept)}
                    />
                ))}
            </div>
        </div>
    );
};

const PublicationList: React.FC<{
    publications: RankedArticle[];
    activeFilter: string | null;
    onClearFilter: () => void;
}> = ({ publications, activeFilter, onClearFilter }) => (
    <div>
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-text-primary">Publications ({publications.length})</h3>
            {activeFilter && (
                <div className="flex items-center gap-2 animate-fadeIn bg-background p-2 rounded-lg border border-border">
                    <p className="text-sm text-text-secondary">Filtered by: <span className="font-semibold text-text-primary">{activeFilter}</span></p>
                    <button onClick={onClearFilter} className="p-1 rounded-full text-text-secondary hover:bg-surface-hover" aria-label="Clear filter">
                        <XIcon className="h-4 w-4"/>
                    </button>
                </div>
            )}
        </div>
        <div className="space-y-4">
            {publications.map((article) => {
                const articleLink = article.pmcId ? `https://www.ncbi.nlm.nih.gov/pmc/articles/${article.pmcId}/` : `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`;
                return (
                    <div key={article.pmid} className="bg-surface p-4 border border-border rounded-lg">
                        <div className="flex items-start justify-between gap-3">
                            <a href={articleLink} target="_blank" rel="noopener noreferrer" className="font-semibold text-text-primary hover:text-brand-accent flex-grow pr-2">{article.title}</a>
                            {article.isOpenAccess && (
                                <div className="flex-shrink-0 flex items-center text-xs text-green-400 font-medium" title="Open Access Full Text Available">
                                    <UnlockIcon className="h-4 w-4 mr-1.5" />
                                    <span>Open Access</span>
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-text-secondary mt-1">{article.authors} ({article.pubYear}) - <em className="italic">{article.journal}</em></p>
                    </div>
                );
            })}
        </div>
    </div>
);

const ProfileView: React.FC<{ profile: AuthorProfile; onReset: () => void; }> = ({ profile, onReset }) => {
    const { settings } = useSettings();
    const [activeConcept, setActiveConcept] = useState<string | null>(null);

    const filteredPublications = useMemo(() => {
        const sortedPublications = [...profile.publications].sort((a, b) => parseInt(b.pubYear) - parseInt(a.pubYear));
        if (!activeConcept) {
            return sortedPublications;
        }
        const lowercasedConcept = activeConcept.toLowerCase();
        return sortedPublications.filter(p =>
             p.title.toLowerCase().includes(lowercasedConcept) ||
             (p.summary && p.summary.toLowerCase().includes(lowercasedConcept)) ||
             (p.keywords && p.keywords.some(k => k.toLowerCase().includes(lowercasedConcept)))
        );
    }, [activeConcept, profile.publications]);

    return (
        <div className="space-y-8 animate-fadeIn">
            <AuthorProfileHeader profile={profile} onReset={onReset} />
            <AuthorMetricsDisplay metrics={profile.metrics} />
            <AICareerSummary summary={profile.careerSummary} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <CoreConcepts
                    concepts={profile.coreConcepts}
                    publications={profile.publications}
                    activeConcept={activeConcept}
                    setActiveConcept={setActiveConcept}
                />
                <PublicationTimeline publications={profile.publications} settings={settings} />
            </div>
            <PublicationList 
                publications={filteredPublications} 
                activeFilter={activeConcept}
                onClearFilter={() => setActiveConcept(null)} 
            />
        </div>
    );
};


// --- Main Component ---

export const AuthorsView: React.FC = () => {
    const [view, setView] = useState<'landing' | 'loading' | 'disambiguation' | 'profile'>('landing');
    const [loadingPhase, setLoadingPhase] = useState('');
    const [authorQuery, setAuthorQuery] = useState('');
    const [clusters, setClusters] = useState<AuthorCluster[]>([]);
    const [profile, setProfile] = useState<AuthorProfile | null>(null);
    const { settings } = useSettings();
    const [suggestedAuthors, setSuggestedAuthors] = useState<{name: string; description: string;}[] | null>(null);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [suggestionError, setSuggestionError] = useState<string | null>(null);
    const [searchError, setSearchError] = useState<string | null>(null);

    const [featuredAuthorCategories, setFeaturedAuthorCategories] = useState<any[]>([]);
    const [isLoadingFeatured, setIsLoadingFeatured] = useState(true);
    const [featuredAuthorsError, setFeaturedAuthorsError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/data/featuredAuthors.json')
            .then(res => {
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                return res.json();
            })
            .then(data => {
                setFeaturedAuthorCategories(data);
            })
            .catch(err => {
                console.error("Failed to load featured authors", err);
                setFeaturedAuthorsError("Could not load featured researchers. Please check your network connection.");
            })
            .finally(() => {
                 setIsLoadingFeatured(false);
            });
    }, []);

    const handleSuggest = useCallback(async (fieldOfStudy: string) => {
        setIsSuggesting(true);
        setSuggestionError(null);
        setSuggestedAuthors(null);
        try {
            const authors = await suggestAuthors(fieldOfStudy, settings.ai);
            setSuggestedAuthors(authors);
        } catch (err) {
            setSuggestionError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsSuggesting(false);
        }
    }, [settings.ai]);


    const handleClusterSelection = useCallback(async (cluster: AuthorCluster) => {
        setView('loading');
        setLoadingPhase(authorLoadingPhases[3]);
        try {
            const articles = await fetchArticleDetails(cluster.pmids);

            setLoadingPhase(authorLoadingPhases[4]);
            const analysis = await generateAuthorProfileAnalysis(cluster.nameVariant, articles, settings.ai);

            const firstAuthorCount = articles.filter(a => a.authors?.toLowerCase().startsWith(cluster.nameVariant.split(' ').pop()!.toLowerCase())).length;
            const lastAuthorCount = articles.filter(a => a.authors?.toLowerCase().endsWith(cluster.nameVariant.split(' ').pop()!.toLowerCase())).length;

            setLoadingPhase(authorLoadingPhases[5]);

            const fullProfile: AuthorProfile = {
                name: cluster.nameVariant,
                affiliations: [cluster.primaryAffiliation],
                metrics: {
                    hIndex: analysis.estimatedMetrics.hIndex,
                    totalCitations: analysis.estimatedMetrics.totalCitations,
                    publicationCount: cluster.publicationCount,
                    citationsPerYear: {},
                    publicationsAsFirstAuthor: firstAuthorCount,
                    publicationsAsLastAuthor: lastAuthorCount
                },
                careerSummary: analysis.careerSummary,
                coreConcepts: analysis.coreConcepts,
                publications: articles.map(a => ({ ...a, pmid: a.pmid!, title: a.title!, authors: a.authors!, journal: a.journal!, pubYear: a.pubYear!, relevanceScore: 0, relevanceExplanation: '', summary: a.summary!, keywords: [], isOpenAccess: a.isOpenAccess || false })),
            };
            
            setProfile(fullProfile);
            setView('profile');
        } catch (err) {
            setSearchError(err instanceof Error ? err.message : 'An unknown error occurred while building the profile.');
            setView('landing');
        }
    }, [settings.ai]);

    const handleSearch = useCallback(async (name: string) => {
        setSearchError(null);
        setAuthorQuery(name);
        setView('loading');
        setLoadingPhase(authorLoadingPhases[0]);

        try {
            const pmids = await searchPubMedForIds(`${name}[Author]`, settings.ai.researchAssistant.authorSearchLimit);
            if (pmids.length === 0) {
                setSearchError(`No publications found for "${name}". Please check the spelling or try a different name.`);
                setView('landing');
                return;
            }

            setLoadingPhase(authorLoadingPhases[1]);
            const articles = await fetchArticleDetails(pmids);

            setLoadingPhase(authorLoadingPhases[2]);
            const authorClusters = await disambiguateAuthor(name, articles, settings.ai);
            
            if (authorClusters.length > 1) {
                const mainCluster = authorClusters.reduce((prev, current) => (prev.publicationCount > current.publicationCount) ? prev : current);
                const otherClusters = authorClusters.filter(c => c !== mainCluster);
                const SMALL_CLUSTER_THRESHOLD = 5;

                // Heuristic: If one cluster is dominant and all others are tiny, merge them.
                if (mainCluster.publicationCount > (SMALL_CLUSTER_THRESHOLD * 2) && otherClusters.every(c => c.publicationCount <= SMALL_CLUSTER_THRESHOLD)) {
                    const allPmids = new Set(mainCluster.pmids);
                    otherClusters.forEach(cluster => {
                        cluster.pmids.forEach(pmid => allPmids.add(pmid));
                    });

                    const mergedCluster: AuthorCluster = {
                        ...mainCluster,
                        pmids: Array.from(allPmids),
                        publicationCount: allPmids.size,
                    };
                    
                    await handleClusterSelection(mergedCluster);
                    return; // Skip disambiguation view
                }
            }
            
            if (authorClusters.length === 0) {
                setSearchError(`Could not create a distinct author profile for "${name}". They may have too few publications or publications under different name variations.`);
                setView('landing');
            } else if (authorClusters.length === 1) {
                await handleClusterSelection(authorClusters[0]);
            } else {
                setClusters(authorClusters);
                setView('disambiguation');
            }
        } catch (err) {
             setSearchError(err instanceof Error ? err.message : 'An unknown error occurred during the search.');
             setView('landing');
        }
    }, [settings.ai, handleClusterSelection]);
    
    const handleReset = useCallback(() => {
        setView('landing');
        setProfile(null);
        setClusters([]);
        setAuthorQuery('');
        setLoadingPhase('');
        setSuggestedAuthors(null);
        setSuggestionError(null);
        setSearchError(null);
    }, []);

    const renderContent = () => {
        switch (view) {
            case 'loading':
                return <AuthorLoadingView phase={loadingPhase} />;
            case 'disambiguation':
                return <DisambiguationView clusters={clusters} onSelect={handleClusterSelection} authorQuery={authorQuery} />;
            case 'profile':
                return profile ? <ProfileView profile={profile} onReset={handleReset} /> : null;
            case 'landing':
            default:
                 return (
                    <>
                        <LandingView 
                            onSearch={handleSearch} 
                            onSuggest={handleSuggest}
                            isSuggesting={isSuggesting}
                            suggestionError={suggestionError}
                            searchError={searchError}
                            suggestedAuthors={suggestedAuthors}
                        />
                         <div className="mt-16 max-w-6xl mx-auto">
                            <FeaturedAuthorsView categories={featuredAuthorCategories} onSelectAuthor={handleSearch} isLoading={isLoadingFeatured} error={featuredAuthorsError} />
                        </div>
                    </>
                 );
        }
    };

    return (
        <div className="max-w-7xl mx-auto">
            {renderContent()}
        </div>
    );
};