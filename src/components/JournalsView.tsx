import React, { useState, useCallback, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useKnowledgeBase } from '../contexts/KnowledgeBaseContext';
import { useUI } from '../contexts/UIContext';
import { findOaArticlesInJournal, generateJournalProfileAnalysis } from '../services/journalService';
import type { JournalProfile, Article } from '../types';
import { SearchIcon } from './icons/SearchIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';

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
    <a href={`https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`} target="_blank" rel="noopener noreferrer" className="block p-3 bg-surface border border-border rounded-md hover:bg-surface-hover hover:border-brand-accent/50 transition-colors">
        <p className="font-semibold text-sm text-text-primary">{article.title}</p>
        <p className="text-xs text-text-secondary mt-1">{article.authors} ({article.pubYear}) - <em>{article.journal}</em></p>
    </a>
);

const JournalsView: React.FC = () => {
    const [journalName, setJournalName] = useState('');
    const [topic, setTopic] = useState('');
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
                const response = await fetch('/data/featuredJournals.json');
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
                topic.trim() ? findOaArticlesInJournal(journalName, topic) : Promise.resolve([])
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
    }, [journalName, topic, settings.ai, saveJournalProfile, setNotification]);
    
    const handleFeaturedSelect = (name: string) => {
        setJournalName(name);
    };

    return (
        <div className="max-w-4xl mx-auto animate-fadeIn space-y-8">
            <div className="text-center">
                <h1 className="text-4xl font-bold brand-gradient-text">Journal Hub</h1>
                <p className="mt-2 text-lg text-text-secondary">Discover and analyze scientific journals.</p>
            </div>

            <form onSubmit={handleAnalyzeJournal} className="bg-surface p-6 rounded-lg border border-border shadow-lg space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="journalName" className="block text-sm font-semibold text-text-primary mb-2">Journal Name</label>
                        <input
                            id="journalName"
                            type="text"
                            value={journalName}
                            onChange={(e) => setJournalName(e.target.value)}
                            placeholder="e.g., PLOS ONE"
                            className="w-full bg-input-bg border border-border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent"
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
                            placeholder="e.g., neuroscience"
                             className="w-full bg-input-bg border border-border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                        />
                         <p className="text-xs text-text-secondary mt-1">If provided, will search for open access articles on this topic within the journal.</p>
                    </div>
                </div>
                 <button type="submit" disabled={isLoading} className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-transparent shadow-sm text-sm font-semibold rounded-md text-brand-text-on-accent bg-brand-accent hover:bg-opacity-90 disabled:opacity-50">
                    {isLoading ? 'Analyzing...' : <><SearchIcon className="h-5 w-5 mr-2" />Analyze Journal</>}
                </button>
            </form>

            {isLoading && (
                 <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-accent mx-auto mb-4"></div>
                    <p className="text-text-secondary">AI is analyzing the journal and searching for articles...</p>
                </div>
            )}
            
            {error && !isLoading && <div className="text-center text-red-400 p-4 bg-red-500/10 border border-red-500/20 rounded-md">{error}</div>}

            {journalProfile && foundArticles && !isLoading && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="bg-surface p-6 rounded-lg border border-border">
                        <h2 className="text-2xl font-bold text-text-primary">{journalProfile.name}</h2>
                        <p className="text-sm text-text-secondary font-mono">{journalProfile.issn}</p>
                        <p className="mt-4 text-text-secondary/90">{journalProfile.description}</p>
                        <div className="mt-4 pt-4 border-t border-border space-y-2 text-sm">
                            <p><strong>Open Access Policy:</strong> <span className="font-semibold text-brand-accent">{journalProfile.oaPolicy}</span></p>
                            <div>
                                <strong className="block mb-2">Main Focus Areas:</strong>
                                <div className="flex flex-wrap gap-2">
                                    {journalProfile.focusAreas.map(area => (
                                        <span key={area} className="bg-sky-500/10 text-sky-300 text-xs font-medium px-2.5 py-0.5 rounded-full border border-sky-500/20">{area}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                     <div className="bg-surface p-6 rounded-lg border border-border">
                        <h3 className="text-xl font-bold text-text-primary mb-4">Found Open Access Articles on "{topic}" ({foundArticles.length})</h3>
                        {foundArticles.length > 0 ? (
                             <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                {foundArticles.map(article => <ArticleListItem key={article.pmid} article={article} />)}
                             </div>
                        ) : (
                            <p className="text-text-secondary text-center py-4">{topic.trim() ? `No open access articles found for "${topic}" in this journal.` : `No topic was provided to search for articles.`}</p>
                        )}
                    </div>
                </div>
            )}

            {!isLoading && !journalProfile && featuredJournals.length > 0 && (
                 <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-text-primary text-center">Or Select a Featured Journal</h2>
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