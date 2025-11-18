import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useKnowledgeBase } from '../contexts/KnowledgeBaseContext';
import { useUI } from '../contexts/UIContext';
import { findArticlesInJournal, generateJournalProfileAnalysis } from '../services/journalService';
import type { JournalProfile, Article } from '../types';
import { SearchIcon } from './icons/SearchIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { Toggle } from './Toggle';
import { UnlockIcon } from './icons/UnlockIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

interface FeaturedJournal {
    name: string;
    description: string;
}

const JournalCard: React.FC<{ name: string; description: string; onClick: () => void; }> = ({ name, description, onClick }) => (
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
            Select <ChevronRightIcon className="h-4 w-4 ml-1" />
        </div>
    </button>
);

const ArticleListItem: React.FC<{ article: Article }> = ({ article }) => (
    <a href={`https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`} target="_blank" rel="noopener noreferrer" className="block p-4 bg-surface border border-border rounded-lg hover:bg-surface-hover hover:border-brand-accent/50 transition-all duration-200 group">
        <div className="flex justify-between items-start gap-4">
            <div>
                <p className="font-semibold text-sm text-text-primary group-hover:text-brand-accent transition-colors line-clamp-2">{article.title}</p>
                <p className="text-xs text-text-secondary mt-1.5">{article.authors}</p>
            </div>
            {article.pubYear && <span className="text-xs font-mono bg-surface-hover border border-border px-2 py-0.5 rounded text-text-secondary whitespace-nowrap">{article.pubYear}</span>}
        </div>
    </a>
);

const JournalsView: React.FC = () => {
    const [journalName, setJournalName] = useState('');
    const [topic, setTopic] = useState('');
    const [onlyOa, setOnlyOa] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [journalProfile, setJournalProfile] = useState<JournalProfile | null>(null);
    const [foundArticles, setFoundArticles] = useState<Article[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [featuredJournals, setFeaturedJournals] = useState<FeaturedJournal[]>([]);

    const { settings } = useSettings();
    const { saveJournalProfile } = useKnowledgeBase();
    const { setNotification } = useUI();

    useEffect(() => {
        const fetchFeatured = async () => {
            try {
                const response = await fetch('/src/data/featuredJournals.json');
                if (!response.ok) throw new Error('Failed to load featured journals');
                const data = await response.json();
                setFeaturedJournals(data);
            } catch (err) {
                console.error("Error fetching featured journals:", err);
            }
        };
        fetchFeatured();
    }, []);

    const handleAnalyzeJournal = useCallback(async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!journalName.trim()) {
            setNotification({ id: Date.now(), message: 'Please provide a journal name.', type: 'error' });
            return;
        }

        setIsLoading(true);
        setError(null);
        setJournalProfile(null);
        setFoundArticles(null);

        try {
            const [profile, articles] = await Promise.all([
                generateJournalProfileAnalysis(journalName, settings.ai),
                findArticlesInJournal(journalName, topic, onlyOa)
            ]);

            setJournalProfile(profile);
            setFoundArticles(articles);
            await saveJournalProfile(profile, articles);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(errorMessage);
            setNotification({ id: Date.now(), message: errorMessage, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, [journalName, topic, onlyOa, settings.ai, saveJournalProfile, setNotification]);
    
    const handleFeaturedSelect = (name: string) => {
        setJournalName(name);
        // Optional: Automatically trigger analysis for featured journals? 
        // Let's keep it manual so user can add topic/filters
    };

    // --- Analytics Data Preparation ---
    const analyticsData = useMemo(() => {
        if (!foundArticles || foundArticles.length === 0) return null;

        // 1. Topic Distribution (Approximate by counting common words in titles - primitive but fast)
        // A better way would be to use AI, but we want instant feedback here.
        const stopWords = new Set(['the', 'and', 'of', 'in', 'a', 'for', 'to', 'with', 'on', 'at', 'by', 'an', 'is', 'from', 'as', 'effect', 'effects', 'analysis', 'study', 'review', 'patient', 'patients', 'using', 'during', 'after', 'based', 'treatment', 'clinical']);
        const wordCounts: Record<string, number> = {};
        
        foundArticles.forEach(a => {
            const words = a.title.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
            words.forEach(w => {
                if (w.length > 4 && !stopWords.has(w)) {
                    wordCounts[w] = (wordCounts[w] || 0) + 1;
                }
            });
        });

        const topTopics = Object.entries(wordCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 6);

        const topicData = {
            labels: topTopics.map(([word]) => word),
            datasets: [{
                data: topTopics.map(([, count]) => count),
                backgroundColor: [
                    'rgba(31, 111, 235, 0.7)',
                    'rgba(57, 197, 247, 0.7)',
                    'rgba(232, 83, 165, 0.7)',
                    'rgba(245, 158, 11, 0.7)',
                    'rgba(16, 185, 129, 0.7)',
                    'rgba(99, 102, 241, 0.7)',
                ],
                borderWidth: 0
            }]
        };

        // 2. Timeline
        const years: Record<string, number> = {};
        foundArticles.forEach(a => {
             if (a.pubYear) {
                 years[a.pubYear] = (years[a.pubYear] || 0) + 1;
             }
        });
        const sortedYears = Object.keys(years).sort();
        const timelineData = {
            labels: sortedYears,
            datasets: [{
                label: 'Articles',
                data: sortedYears.map(y => years[y]),
                backgroundColor: 'rgba(31, 111, 235, 0.5)',
                borderColor: 'rgba(31, 111, 235, 1)',
                borderWidth: 1,
                borderRadius: 4
            }]
        };

        return { topicData, timelineData };

    }, [foundArticles]);

    const isDarkMode = settings.theme === 'dark';
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'right' as const, labels: { color: isDarkMode ? '#9ca3af' : '#4b5563', boxWidth: 12 } },
        },
        cutout: '70%',
    };
    
    const barOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            x: { grid: { display: false }, ticks: { color: isDarkMode ? '#9ca3af' : '#4b5563' } },
            y: { grid: { color: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }, ticks: { color: isDarkMode ? '#9ca3af' : '#4b5563', stepSize: 1 } }
        }
    };


    return (
        <div className="max-w-5xl mx-auto animate-fadeIn space-y-8">
            <div className="text-center">
                <h1 className="text-4xl font-bold brand-gradient-text">Journal Hub</h1>
                <p className="mt-2 text-lg text-text-secondary">Discover, analyze, and track scientific journals.</p>
            </div>

            <form onSubmit={handleAnalyzeJournal} className="bg-surface p-6 rounded-lg border border-border shadow-lg space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="journalName" className="block text-sm font-semibold text-text-primary mb-2">Journal Name</label>
                        <input
                            id="journalName"
                            type="text"
                            value={journalName}
                            onChange={(e) => setJournalName(e.target.value)}
                            placeholder="e.g., PLOS ONE, Nature, The Lancet"
                            className="w-full bg-input-bg border border-border rounded-md py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent transition-all"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="topic" className="block text-sm font-semibold text-text-primary mb-2">Topic of Interest (Optional)</label>
                        <input
                            id="topic"
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="e.g., immunotherapy, climate change"
                             className="w-full bg-input-bg border border-border rounded-md py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent transition-all"
                        />
                    </div>
                </div>
                
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2">
                     <div className="flex items-center bg-background/50 p-2 rounded-md border border-border">
                        <Toggle checked={onlyOa} onChange={setOnlyOa}>
                            <div className="flex items-center gap-2 text-sm">
                                <UnlockIcon className={`h-4 w-4 ${onlyOa ? 'text-green-400' : 'text-text-secondary'}`} />
                                <span>Open Access Only</span>
                            </div>
                        </Toggle>
                    </div>

                    <button type="submit" disabled={isLoading} className="w-full sm:w-auto inline-flex justify-center items-center py-2.5 px-6 border border-transparent shadow-sm text-sm font-semibold rounded-md text-brand-text-on-accent bg-brand-accent hover:bg-opacity-90 disabled:opacity-50 transition-all hover:shadow-brand-accent/20 hover:shadow-lg">
                        {isLoading ? <span className="flex items-center"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></span>Analyzing...</span> : <><SearchIcon className="h-5 w-5 mr-2" />Analyze Journal</>}
                    </button>
                </div>
            </form>

            {error && !isLoading && <div className="text-center text-red-400 p-4 bg-red-500/10 border border-red-500/20 rounded-md animate-fadeIn">{error}</div>}

            {journalProfile && foundArticles && !isLoading && (
                <div className="space-y-6 animate-fadeIn">
                    {/* Journal Header Card */}
                    <div className="bg-surface p-6 rounded-lg border border-border shadow-sm relative overflow-hidden">
                         <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                             <ChartBarIcon className="h-32 w-32 text-brand-accent" />
                         </div>
                        <div className="relative z-10">
                            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                <div>
                                    <h2 className="text-3xl font-bold text-text-primary">{journalProfile.name}</h2>
                                    <p className="text-sm font-mono text-brand-accent mt-1">{journalProfile.issn}</p>
                                </div>
                                <div className="flex gap-2">
                                     <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                                        {journalProfile.oaPolicy}
                                     </span>
                                </div>
                            </div>
                            <p className="mt-6 text-text-secondary/90 max-w-3xl leading-relaxed">{journalProfile.description}</p>
                            
                            <div className="mt-6">
                                <strong className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Focus Areas</strong>
                                <div className="flex flex-wrap gap-2">
                                    {journalProfile.focusAreas.map(area => (
                                        <span key={area} className="bg-surface-hover text-text-primary text-xs font-medium px-3 py-1 rounded-full border border-border">{area}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Analytics Section */}
                         <div className="lg:col-span-1 space-y-6">
                            <div className="bg-surface p-5 rounded-lg border border-border">
                                <h3 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wide">Recent Topic Landscape</h3>
                                <div className="h-48">
                                    {analyticsData ? <Doughnut data={analyticsData.topicData} options={chartOptions} /> : <p className="text-xs text-text-secondary text-center pt-10">Insufficient data for topics.</p>}
                                </div>
                            </div>
                            <div className="bg-surface p-5 rounded-lg border border-border">
                                <h3 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wide">Activity Timeline</h3>
                                <div className="h-32">
                                     {analyticsData ? <Bar data={analyticsData.timelineData} options={barOptions} /> : <p className="text-xs text-text-secondary text-center pt-10">Insufficient data for timeline.</p>}
                                </div>
                            </div>
                         </div>
                        
                        {/* Articles List */}
                        <div className="lg:col-span-2 bg-surface p-6 rounded-lg border border-border flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-text-primary">
                                    Latest Articles {topic.trim() && <span>on "{topic}"</span>}
                                </h3>
                                <span className="text-xs font-medium bg-brand-accent text-white px-2 py-1 rounded-full">{foundArticles.length}</span>
                            </div>
                            
                            {foundArticles.length > 0 ? (
                                <div className="space-y-3 overflow-y-auto pr-2 max-h-[500px] scrollbar-thin">
                                    {foundArticles.map(article => <ArticleListItem key={article.pmid} article={article} />)}
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-text-secondary">
                                    <p>No articles found matching your criteria.</p>
                                    <p className="text-sm mt-2">Try broadening your topic or disabling "Open Access Only".</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {!isLoading && !journalProfile && featuredJournals.length > 0 && (
                 <div className="space-y-8 pt-8 border-t border-border/50">
                    <div className="text-center">
                         <h2 className="text-2xl font-bold text-text-primary">Featured Journals</h2>
                         <p className="text-text-secondary text-sm mt-1">Start your analysis with one of these top-tier publications.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {featuredJournals.map(journal => (
                            <JournalCard key={journal.name} {...journal} onClick={() => handleFeaturedSelect(journal.name)} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default JournalsView;
