import React, { useEffect, useState, useRef } from 'react';
import type { AggregatedArticle, SimilarArticle, OnlineFindings } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { findSimilarArticles, findRelatedOnline, generateTldrSummary } from '../services/geminiService';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { XIcon } from './icons/XIcon';
import { UnlockIcon } from './icons/UnlockIcon';
import { TagIcon } from './icons/TagIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { WebIcon } from './icons/WebIcon';
import { RelevanceScoreDisplay } from './RelevanceScoreDisplay';
import { AcademicCapIcon } from './icons/AcademicCapIcon';
import { useKnowledgeBase } from '../contexts/KnowledgeBaseContext';
import { ChevronUpIcon } from './icons/ChevronUpIcon';


interface ArticleDetailPanelProps {
    article: AggregatedArticle; 
    onClose: () => void;
    findRelatedInsights: (pmid: string) => { question: string, answer: string, supportingArticles: string[] }[];
}

const SkeletonLoader: React.FC<{ lines?: number; className?: string }> = ({ lines = 3, className = '' }) => (
    <div className={`space-y-3 animate-pulse ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
            <div key={i} className="p-3 rounded-md bg-background border border-border/70">
                <div className="h-4 w-3/4 rounded bg-border"></div>
                <div className="mt-2 h-2 w-1/4 rounded bg-border"></div>
                <div className="mt-3 h-2 w-5/6 rounded bg-border"></div>
            </div>
        ))}
    </div>
);


export const ArticleDetailPanel: React.FC<ArticleDetailPanelProps> = ({ article, onClose, findRelatedInsights }) => {
    const { settings } = useSettings();
    const { updateTags } = useKnowledgeBase();
    const [tagInput, setTagInput] = useState('');
    
    const [similarArticles, setSimilarArticles] = useState<SimilarArticle[] | null>(null);
    const [isFindingSimilar, setIsFindingSimilar] = useState(false);
    const [findError, setFindError] = useState<string | null>(null);
    
    const [onlineFindings, setOnlineFindings] = useState<OnlineFindings | null>(null);
    const [isFindingOnline, setIsFindingOnline] = useState(false);
    const [findOnlineError, setFindOnlineError] = useState<string | null>(null);
    
    const [tldr, setTldr] = useState<string | null>(null);
    const [isGeneratingTldr, setIsGeneratingTldr] = useState(false);
    const [tldrError, setTldrError] = useState<string | null>(null);

    const [isClosing, setIsClosing] = useState(false);
    const [showGoToTop, setShowGoToTop] = useState(false);

    const relatedInsights = findRelatedInsights(article.pmid);
    const panelRef = useFocusTrap<HTMLDivElement>(true);
    const scrollableContainerRef = useRef<HTMLDivElement>(null);
    
    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 300); // Match duration of closing animation
    };

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
           if (event.key === 'Escape') {
               handleClose();
           }
        };
        window.addEventListener('keydown', handleEsc);
        document.body.style.overflow = 'hidden';

        return () => {
            window.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = '';
        };
    }, []);

    useEffect(() => {
        const container = scrollableContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            if (container.scrollTop > 300) {
                setShowGoToTop(true);
            } else {
                setShowGoToTop(false);
            }
        };

        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        scrollableContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };
    
    const handleAddTag = (e: React.FormEvent) => {
        e.preventDefault();
        const newTag = tagInput.trim();
        if (newTag && !(article.customTags || []).includes(newTag)) {
            updateTags(article.pmid, [...(article.customTags || []), newTag]);
            setTagInput('');
        }
    };
    
    const handleRemoveTag = (tagToRemove: string) => {
        updateTags(article.pmid, (article.customTags || []).filter(tag => tag !== tagToRemove));
    };

    const handleFindSimilar = async () => {
        setIsFindingSimilar(true);
        setFindError(null);
        setSimilarArticles(null);
        try {
            const results = await findSimilarArticles({ title: article.title, summary: article.summary }, settings.ai);
            setSimilarArticles(results);
        } catch (err) {
            setFindError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsFindingSimilar(false);
        }
    };

    const handleFindRelatedOnline = async () => {
        setIsFindingOnline(true);
        setFindOnlineError(null);
        setOnlineFindings(null);
        try {
            const results = await findRelatedOnline(article.title, settings.ai);
            setOnlineFindings(results);
        } catch (err) {
            setFindOnlineError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsFindingOnline(false);
        }
    };

    const handleGenerateTldr = async () => {
        setIsGeneratingTldr(true);
        setTldrError(null);
        setTldr(null);
        try {
            const result = await generateTldrSummary(article.summary, settings.ai);
            setTldr(result);
        } catch (err) {
            setTldrError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsGeneratingTldr(false);
        }
    };


    const articleLink = article.pmcId 
      ? `https://www.ncbi.nlm.nih.gov/pmc/articles/${article.pmcId}/`
      : `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`;
    
    const googleScholarUrl = `https://scholar.google.com/scholar?q=${encodeURIComponent(article.title)}`;
    const semanticScholarUrl = `https://www.semanticscholar.org/search?q=${encodeURIComponent(article.title)}`;
      
    return (
         <div className="fixed inset-0 z-30" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
            <div className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`} onClick={handleClose} aria-hidden="true"></div>
            <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
                <div ref={panelRef} className={`relative w-screen max-w-2xl transform transition ease-in-out duration-300 ${isClosing ? 'translate-x-full' : 'translate-x-0'}`}>
                    <div className="absolute top-0 left-0 -ml-8 flex pt-4 pr-2 sm:-ml-10 sm:pr-4">
                        <button type="button" aria-label="Close panel" className="rounded-md text-gray-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-white" onClick={handleClose}>
                            <XIcon className="h-6 w-6" aria-hidden="true" />
                        </button>
                    </div>

                    <div ref={scrollableContainerRef} className="flex h-full flex-col overflow-y-scroll bg-surface py-6 shadow-xl border-l border-border">
                        <div className="px-4 sm:px-6">
                           <div className="flex items-start justify-between gap-4">
                                <h2 className="text-xl font-bold text-brand-accent leading-6 pr-4" id="slide-over-title">
                                   <a href={articleLink} target="_blank" rel="noopener noreferrer" className="hover:underline">{article.title}</a>
                                </h2>
                                <RelevanceScoreDisplay score={article.relevanceScore} />
                            </div>
                              {article.isOpenAccess && ( <div className="mt-1 flex items-center text-sm font-medium text-green-400"><UnlockIcon className="h-4 w-4 mr-1.5" aria-hidden="true"/>Open Access Article</div>)}
                        </div>
                        <div className="relative mt-6 flex-1 px-4 sm:px-6">
                            <div className="space-y-6">
                                <div className="flex items-center justify-between text-text-secondary">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium">Authors</p>
                                        <p className="text-base text-text-primary truncate">{article.authors}</p>
                                    </div>
                                    <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                                        <a href={googleScholarUrl} target="_blank" rel="noopener noreferrer" className="hover:text-brand-accent" aria-label="Search on Google Scholar">
                                            <AcademicCapIcon className="h-6 w-6" aria-hidden="true"/>
                                        </a>
                                        <a href={semanticScholarUrl} target="_blank" rel="noopener noreferrer" className="hover:text-brand-accent font-bold text-xl" aria-label="Search on Semantic Scholar">
                                            S
                                        </a>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-text-secondary">Publication</p>
                                    <p className="text-base text-text-primary italic">{article.journal} ({article.pubYear})</p>
                                </div>

                                <div className="pt-4 border-t border-border">
                                    <h4 className="font-semibold text-text-primary mb-2">Summary</h4>
                                    <p className="text-base text-text-primary/90 leading-relaxed">{article.summary}</p>
                                    {settings.ai.enableTldr && (
                                        <div className="mt-4">
                                            <button onClick={handleGenerateTldr} disabled={isGeneratingTldr} className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-brand-text-on-accent bg-brand-accent/80 hover:bg-opacity-90 disabled:opacity-50">
                                                {isGeneratingTldr ? (
                                                    <><svg className="animate-spin -ml-1 mr-3 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Generating...</>
                                                ) : (
                                                    <><SparklesIcon className="h-4 w-4 mr-2" aria-hidden="true" />Generate AI TL;DR</>
                                                )}
                                            </button>
                                            {isGeneratingTldr && <div className="mt-2 text-sm text-text-secondary animate-pulse">The AI is thinking...</div>}
                                            {tldrError && <p className="mt-2 text-xs text-red-400">{tldrError}</p>}
                                            {tldr && <p className="mt-2 text-sm text-brand-accent bg-brand-accent/10 border border-brand-accent/20 p-2 rounded-md font-semibold"><em>{tldr}</em></p>}
                                        </div>
                                    )}
                                </div>
                                
                                 <div className="pt-4 border-t border-border">
                                    <h4 className="font-semibold text-text-primary mb-2">Keywords</h4>
                                     <div className="flex flex-wrap gap-2">
                                        {article.keywords.map(kw => ( <span key={kw} className="bg-sky-500/10 text-sky-300 text-xs font-medium px-2.5 py-0.5 rounded-full border border-sky-500/20">{kw}</span>))}
                                    </div>
                                </div>
                                
                                <div className="pt-4 border-t border-border">
                                    <h4 className="font-semibold text-text-primary mb-2 flex items-center"><TagIcon className="h-5 w-5 mr-2" aria-hidden="true"/> Custom Tags</h4>
                                     <div className="flex flex-wrap gap-2 mb-3">
                                        {(article.customTags || []).map(tag => (
                                            <span key={tag} className="flex items-center bg-purple-500/10 text-purple-300 text-sm font-medium pl-3 pr-1 py-1 rounded-full border border-purple-500/20">
                                                {tag}
                                                <button onClick={() => handleRemoveTag(tag)} className="ml-2 text-purple-300 hover:text-white" aria-label={`Remove tag ${tag}`}>
                                                    <XIcon className="h-3 w-3" aria-hidden="true"/>
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    <form onSubmit={handleAddTag} className="flex items-center gap-2">
                                        <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="Add a new tag..." className="block w-full bg-background border border-border rounded-md shadow-sm py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent sm:text-sm" />
                                        <button type="submit" className="px-4 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-brand-text-on-accent bg-brand-accent hover:bg-opacity-90">Add</button>
                                    </form>
                                </div>

                                <div className="pt-4 border-t border-border">
                                    <h4 className="font-semibold text-text-primary mb-2">Related AI Insights</h4>
                                    <div className="space-y-3">
                                        {relatedInsights.length > 0 ? relatedInsights.map((insight, index) => (
                                            <div key={index} className="bg-background p-3 rounded-md border border-border">
                                                <p className="font-semibold text-brand-accent text-sm">{insight.question}</p>
                                                <p className="mt-1 text-sm text-text-primary/90 leading-relaxed">{insight.answer}</p>
                                                <div className="mt-3 pt-2 border-t border-border/50">
                                                    <p className="text-xs text-text-secondary font-semibold mb-1">Supporting Evidence:</p>
                                                    <div className="flex flex-wrap gap-x-3 gap-y-1 items-center">
                                                        {insight.supportingArticles.map(pmid => (
                                                            <a 
                                                                href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer" 
                                                                key={pmid} 
                                                                className={`text-xs transition-all ${pmid === article.pmid ? 'text-brand-accent font-bold bg-brand-accent/20 border border-brand-accent/30 px-1.5 py-0.5 rounded' : 'text-text-secondary hover:text-brand-accent hover:underline'}`}
                                                            >
                                                                PMID:{pmid}
                                                            </a>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )) : <p className="text-sm text-text-secondary">No specific AI insights generated for this article in the reports.</p>}
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-border">
                                    <h4 className="font-semibold text-text-primary mb-2">Discovery Tools</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <button
                                            onClick={handleFindSimilar}
                                            disabled={isFindingSimilar || isFindingOnline}
                                            className="w-full inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-semibold rounded-md text-brand-text-on-accent bg-brand-accent hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-brand-accent disabled:bg-border disabled:text-text-secondary disabled:cursor-not-allowed transition-colors"
                                        >
                                            {isFindingSimilar ? (
                                                <><svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Finding...</>
                                            ) : (
                                                <><SparklesIcon className="h-5 w-5 mr-2" aria-hidden="true"/> Find Similar Articles</>
                                            )}
                                        </button>
                                        <button
                                            onClick={handleFindRelatedOnline}
                                            disabled={isFindingSimilar || isFindingOnline}
                                            className="w-full inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-semibold rounded-md text-brand-text-on-accent bg-brand-accent hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-brand-accent disabled:bg-border disabled:text-text-secondary disabled:cursor-not-allowed transition-colors"
                                        >
                                            {isFindingOnline ? (
                                                <><svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Searching...</>
                                            ) : (
                                                <><WebIcon className="h-5 w-5 mr-2" aria-hidden="true"/> Find Online Discussions</>
                                            )}
                                        </button>
                                    </div>
                                    <div className="mt-4 space-y-3">
                                        {isFindingSimilar && <SkeletonLoader />}
                                        {findError && <p className="text-red-400 text-sm text-center">{findError}</p>}
                                        {similarArticles && similarArticles.length === 0 && <p className="text-text-secondary text-sm text-center">No similar articles were found.</p>}
                                        {similarArticles && similarArticles.map(similar => (
                                            <div key={similar.pmid} className="bg-background p-3 rounded-md border border-border/70 animate-fadeIn">
                                                <a href={`https://pubmed.ncbi.nlm.nih.gov/${similar.pmid}/`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-text-primary hover:text-brand-accent transition-colors">
                                                    {similar.title}
                                                </a>
                                                <p className="mt-1 text-xs text-text-secondary/80 italic">PMID: {similar.pmid}</p>
                                                <p className="mt-2 text-xs text-text-secondary"><strong>Reasoning:</strong> {similar.reason}</p>
                                            </div>
                                        ))}
                                    </div>
                                     <div className="mt-4">
                                        {isFindingOnline && <SkeletonLoader lines={1} className="p-3" />}
                                        {findOnlineError && <p className="text-red-400 text-sm text-center">{findOnlineError}</p>}
                                        {onlineFindings && (
                                            <div className="bg-background p-3 rounded-md border border-border/70 animate-fadeIn">
                                                <h5 className="font-semibold text-text-primary mb-2">Online Summary</h5>
                                                <p className="text-sm text-text-secondary/90 mb-3">{onlineFindings.summary}</p>
                                                {onlineFindings.sources.length > 0 && (
                                                    <>
                                                        <h6 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Sources</h6>
                                                        <ul className="mt-2 space-y-1">
                                                            {onlineFindings.sources.map(source => (
                                                                <li key={source.uri}>
                                                                    <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-accent hover:underline truncate block" title={source.title}>
                                                                        {source.title || source.uri}
                                                                    </a>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                     {showGoToTop && (
                        <button
                            onClick={scrollToTop}
                            aria-label="Scroll to top"
                            className="absolute bottom-6 right-6 z-10 p-3 rounded-full bg-brand-accent text-brand-text-on-accent shadow-lg hover:bg-opacity-90 transition-all duration-300 animate-fadeIn"
                        >
                            <ChevronUpIcon className="h-6 w-6" aria-hidden="true"/>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
