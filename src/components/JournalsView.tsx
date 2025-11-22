
import React from 'react';
import { JournalsViewProvider, useJournalsView } from './journals/JournalsViewContext';
import { useJournalsViewLogic } from './journals/useJournalsViewLogic';
import { SearchIcon } from './icons/SearchIcon';
import { Toggle } from './Toggle';
import { UnlockIcon } from './icons/UnlockIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { ArticleListItem, AnalysisCharts, FeaturedJournalsGrid } from './journals/JournalsSubComponents';

const JournalsViewLayout: React.FC = () => {
    const { 
        journalName, setJournalName, 
        topic, setTopic, 
        onlyOa, setOnlyOa, 
        isLoading, 
        journalProfile, 
        foundArticles, 
        error, 
        handleAnalyzeJournal 
    } = useJournalsView();

    return (
        <div className="max-w-5xl mx-auto animate-fadeIn space-y-8 pt-2">
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
                        <AnalysisCharts />
                        
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

            {!isLoading && !journalProfile && <FeaturedJournalsGrid />}
        </div>
    );
};

const JournalsView: React.FC = () => {
    const logic = useJournalsViewLogic();

    return (
        <JournalsViewProvider value={logic}>
            <JournalsViewLayout />
        </JournalsViewProvider>
    );
};

export default JournalsView;
