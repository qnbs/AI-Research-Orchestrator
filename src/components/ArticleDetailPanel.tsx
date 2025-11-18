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
    const [tldr, setTldr] = useState<string | null>(null);
    const [isGeneratingTldr, setIsGeneratingTldr] = useState(false);
    const [tldrError, setTldrError] = useState<string | null>(null);

    const panelRef = useFocusTrap<HTMLDivElement>(true);
    const contentRef = useRef<HTMLDivElement>(null);
    const [showGoToTop, setShowGoToTop] = useState(false);

    const relatedInsights = findRelatedInsights(article.pmid);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        document.body.style.overflow = 'hidden'; // Prevent background scroll

        return () => {
            window.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    useEffect(() => {
        const contentEl = contentRef.current;
        if (!contentEl) return;
        const handleScroll = () => setShowGoToTop(contentEl.scrollTop > 200);
        contentEl.addEventListener('scroll', handleScroll, { passive: true });
        return () => contentEl.removeEventListener('scroll', handleScroll);
    }, []);

    const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const newTag = tagInput.trim();
            if (newTag && !(article.customTags || []).includes(newTag)) {
                updateTags(article.pmid, [...(article.customTags || []), newTag]);
                setTagInput('');
            }
        }
    };
    
    const handleRemoveTag = (tagToRemove: string) => {
        updateTags(article.pmid, (article.customTags || []).filter(tag => tag !== tagToRemove));
    };

    const handleFindSimilar = async () => {
        setIsFindingSimilar(true);
        setFindError(null);
        try {
            const result = await findSimilarArticles({ title: article.title, summary: article.summary }, settings.ai);
            setSimilarArticles(result);
        } catch (err) {
            setFindError(err instanceof Error ? err.message : 'Failed to find similar articles.');
        } finally {
            setIsFindingSimilar(false);
        }
    };
    
    const handleFindOnline = async () => {
        setIsFindingOnline(true);
        try {
            const result = await findRelatedOnline(article.title, settings.ai);
            setOnlineFindings(result);
        } catch (err) {
            // handle error
        } finally {
            setIsFindingOnline(false);
        }
    };

    const handleGenerateTldr = async () => {
        setIsGeneratingTldr(true);
        setTldrError(null);
        try {
            const result = await generateTldrSummary(article.summary, settings.ai);
            setTldr(result);
        } catch (err) {
            setTldrError(err instanceof Error ? err.message : 'Failed to generate TL;DR.');
        } finally {
            setIsGeneratingTldr(false);
        }
    };

    const scrollToTop = () => {
        contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-40 flex justify-end animate-fadeIn" style={{ animationDuration: '200ms' }}>
            <div
                ref={panelRef}
                className="w-full max-w-2xl h-full bg-surface border-l border-border shadow-2xl flex flex-col"
                role="dialog"
                aria-modal="true"
                aria-labelledby="article-detail-title"
            >
                {/* Header */}
                <header className="flex-shrink-0 p-4 border-b border-border flex justify-between items-center bg-surface sticky top-0 z-10">
                    <h2 id="article-detail-title" className="text-lg font-bold text-text-primary truncate pr-4">{article.title}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-hover text-text-secondary" aria-label="Close panel">
                        <XIcon className="h-6 w-6" />
                    </button>
                </header>

                {/* Content */}
                <div ref={contentRef} className="flex-grow overflow-y-auto p-6 space-y-6 relative">
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                            <p className="text-sm text-text-secondary">{article.authors}</p>
                            <p className="text-sm text-text-secondary italic">{article.journal} ({article.pubYear})</p>
                             <div className="mt-2 text-xs text-text-secondary flex items-center gap-4">
                                <a href={`https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`} target="_blank" rel="noopener noreferrer" className="hover:text-brand-accent">PMID: {article.pmid}</a>
                                {article.pmcId && <a href={`https://www.ncbi.nlm.nih.gov/pmc/articles/${article.pmcId}/`} target="_blank" rel="noopener noreferrer" className="hover:text-brand-accent">PMCID: {article.pmcId}</a>}
                                <a href={`https://scholar.google.com/scholar?q=${encodeURIComponent(article.title)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-brand-accent"><AcademicCapIcon className="h-4 w-4" /> Scholar</a>
                             </div>
                        </div>
                        <RelevanceScoreDisplay score={article.relevanceScore} />
                    </div>
                    
                    {article.isOpenAccess && (
                        <div className="flex items-center text-sm text-green-400 font-medium">
                            <UnlockIcon className="h-4 w-4 mr-1.5" />
                            <span>Open Access Article</span>
                        </div>
                    )}

                    <div className="prose prose-sm prose-invert max-w-none text-text-secondary/90 leading-relaxed">
                        <h4 className="font-semibold text-text-primary not-prose">AI Summary</h4>
                        <p>{article.aiSummary || 'No AI summary available.'}</p>
                        <h4 className="font-semibold text-text-primary not-prose mt-4">Original Abstract</h4>
                        <p>{article.summary}</p>
                    </div>

                    <div>
                        <h4 className="font-semibold text-text-primary mb-2 flex items-center gap-2"><TagIcon className="h-5 w-5"/> Tags</h4>
                        <div className="flex flex-wrap gap-2 items-center">
                            {(article.customTags || []).map(tag => (
                                <span key={tag} className="flex items-center bg-purple-500/10 text-purple-300 text-sm font-medium pl-2 pr-1 py-0.5 rounded-full border border-purple-500/20">
                                    {tag}
                                    <button onClick={() => handleRemoveTag(tag)} className="ml-1.5 text-purple-300 hover:text-white focus:outline-none" aria-label={`Remove tag ${tag}`}>
                                        <XIcon className="h-3 w-3"/>
                                    </button>
                                </span>
                            ))}
                             <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleTagInputKeyDown} placeholder="Add tag..." className="bg-input-bg border-border border rounded-md py-0.5 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent" />
                        </div>
                    </div>
                    
                    {relatedInsights.length > 0 && (
                        <div>
                             <h4 className="font-semibold text-text-primary mb-2">Related AI Insights</h4>
                            <div className="space-y-3">
                                {relatedInsights.map((insight, index) => (
                                    <div key={index} className="bg-background p-3 rounded-md border border-border">
                                        <p className="font-semibold text-brand-accent text-sm">{insight.question}</p>
                                        <p className="mt-1 text-sm text-text-primary/90">{insight.answer}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <div className="pt-6 border-t border-border">
                        <h3 className="text-lg font-bold text-text-primary mb-4">Discovery Tools</h3>
                        <div className="space-y-6">
                            {settings.ai.enableTldr && (
                                <div>
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-semibold text-text-primary">TL;DR Summary</h4>
                                        <button onClick={handleGenerateTldr} disabled={isGeneratingTldr} className="inline-flex items-center px-3 py-1 border border-border text-xs font-medium rounded-md shadow-sm text-text-primary bg-surface hover:bg-surface-hover disabled:opacity-50">
                                            {isGeneratingTldr ? 'Generating...' : 'Generate'}
                                        </button>
                                    </div>
                                    {isGeneratingTldr && <div className="h-4 w-3/4 rounded bg-border animate-pulse mt-2"></div>}
                                    {tldrError && <p className="text-xs text-red-400 mt-2">{tldrError}</p>}
                                    {tldr && <p className="text-sm text-text-secondary mt-2 p-3 bg-background rounded-md border border-border italic">"{tldr}"</p>}
                                </div>
                            )}

                             <div>
                                <div className="flex justify-between items-center">
                                    <h4 className="font-semibold text-text-primary flex items-center gap-2"><SparklesIcon className="h-5 w-5 text-accent-cyan"/> Similar PubMed Articles</h4>
                                    <button onClick={handleFindSimilar} disabled={isFindingSimilar} className="inline-flex items-center px-3 py-1 border border-border text-xs font-medium rounded-md shadow-sm text-text-primary bg-surface hover:bg-surface-hover disabled:opacity-50">
                                        {isFindingSimilar ? 'Finding...' : 'Find'}
                                    </button>
                                </div>
                                <div className="mt-3 space-y-3">
                                    {isFindingSimilar && <SkeletonLoader />}
                                    {findError && <p className="text-red-400 text-sm">{findError}</p>}
                                    {similarArticles && similarArticles.map(similar => (
                                        <div key={similar.pmid} className="bg-background p-3 rounded-md border border-border">
                                            <a href={`https://pubmed.ncbi.nlm.nih.gov/${similar.pmid}/`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-text-primary hover:text-brand-accent">
                                                {similar.title}
                                            </a>
                                            <p className="mt-2 text-xs text-text-secondary"><strong>Reasoning:</strong> {similar.reason}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                             <div>
                                <div className="flex justify-between items-center">
                                     <h4 className="font-semibold text-text-primary flex items-center gap-2"><WebIcon className="h-5 w-5 text-accent-amber"/> Related Online Discussions</h4>
                                    <button onClick={handleFindOnline} disabled={isFindingOnline} className="inline-flex items-center px-3 py-1 border border-border text-xs font-medium rounded-md shadow-sm text-text-primary bg-surface hover:bg-surface-hover disabled:opacity-50">
                                        {isFindingOnline ? 'Searching...' : 'Search'}
                                    </button>
                                </div>
                                 <div className="mt-3">
                                    {isFindingOnline && <SkeletonLoader lines={1} />}
                                    {onlineFindings && (
                                        <div className="bg-background p-3 rounded-md border border-border">
                                            <p className="text-sm text-text-secondary mb-3">{onlineFindings.summary}</p>
                                            <ul className="space-y-1">
                                                {onlineFindings.sources.map(source => (
                                                    <li key={source.uri}>
                                                        <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-accent hover:underline truncate block">
                                                            {source.title || source.uri}
                                                        </a>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                     {showGoToTop && (
                        <button onClick={scrollToTop} aria-label="Scroll to top" className="absolute bottom-6 right-6 p-2 rounded-full bg-brand-accent text-brand-text-on-accent shadow-lg hover:bg-opacity-90">
                            <ChevronUpIcon className="h-5 w-5"/>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
