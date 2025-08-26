import React, { useEffect } from 'react';
import type { AggregatedArticle } from '../types';
import { XIcon } from './icons/XIcon';
import { UnlockIcon } from './icons/UnlockIcon';

interface ArticleDetailPanelProps {
    article: AggregatedArticle; 
    onClose: () => void;
    findRelatedInsights: (pmid: string) => { question: string, answer: string }[];
}

export const ArticleDetailPanel: React.FC<ArticleDetailPanelProps> = ({ article, onClose, findRelatedInsights }) => {
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
           if (event.key === 'Escape') {
               onClose();
           }
        };
        window.addEventListener('keydown', handleEsc);
        document.body.style.overflow = 'hidden';

        return () => {
            window.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    const articleLink = article.pmcId 
      ? `https://www.ncbi.nlm.nih.gov/pmc/articles/${article.pmcId}/`
      : `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`;
      
    return (
         <div className="fixed inset-0 z-20" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
            {/* Background backdrop */}
            <div className="absolute inset-0 bg-black/60 transition-opacity" onClick={onClose}></div>

            <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
                <div className="relative w-screen max-w-2xl">
                    {/* Close button */}
                    <div className="absolute top-0 left-0 -ml-8 flex pt-4 pr-2 sm:-ml-10 sm:pr-4">
                        <button
                            type="button"
                            className="rounded-md text-gray-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
                            onClick={onClose}
                        >
                            <span className="sr-only">Close panel</span>
                            <XIcon className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Panel content */}
                    <div className="flex h-full flex-col overflow-y-scroll bg-dark-surface py-6 shadow-xl border-l border-dark-border">
                        <div className="px-4 sm:px-6">
                           <div className="flex items-start justify-between">
                                <h2 className="text-xl font-bold text-brand-accent leading-6 pr-4" id="slide-over-title">
                                   <a href={articleLink} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                     {article.title}
                                   </a>
                                </h2>
                                 <div className="text-right flex-shrink-0 ml-3">
                                    <span className={`text-xl font-bold ${article.relevanceScore > 75 ? 'text-green-400' : article.relevanceScore > 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                        {article.relevanceScore}
                                    </span>
                                    <span className="text-sm text-dark-text-secondary">/100</span>
                                </div>
                            </div>
                              {article.isOpenAccess && (
                                <div className="mt-1 flex items-center text-sm text-green-400">
                                    <UnlockIcon className="h-4 w-4 mr-1.5"/>
                                    Open Access Article
                                </div>
                            )}
                        </div>
                        <div className="relative mt-6 flex-1 px-4 sm:px-6">
                            <div className="space-y-6">
                                <div>
                                    <p className="text-sm font-medium text-dark-text-secondary">Authors</p>
                                    <p className="text-base text-dark-text-primary">{article.authors}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-dark-text-secondary">Publication</p>
                                    <p className="text-base text-dark-text-primary italic">{article.journal} ({article.pubYear})</p>
                                </div>

                                <div className="pt-4 border-t border-dark-border">
                                    <h4 className="font-semibold text-dark-text-primary mb-2">Summary</h4>
                                    <p className="text-base text-dark-text-primary/90 leading-relaxed">{article.summary}</p>
                                </div>
                                
                                <div className="pt-4 border-t border-dark-border">
                                    <h4 className="font-semibold text-dark-text-primary mb-2">Keywords</h4>
                                     <div className="flex flex-wrap gap-2">
                                        {article.keywords.map(kw => (
                                            <span key={kw} className="bg-sky-500/10 text-sky-300 text-xs font-medium px-2.5 py-0.5 rounded-full border border-sky-500/20">{kw}</span>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-dark-border">
                                    <h4 className="font-semibold text-dark-text-primary mb-2">Related AI Insights</h4>
                                    <div className="space-y-3">
                                        {findRelatedInsights(article.pmid).length > 0 ? findRelatedInsights(article.pmid).map((insight, index) => (
                                            <div key={index} className="bg-dark-bg p-3 rounded-md border border-dark-border">
                                                <p className="font-semibold text-brand-accent text-sm">{insight.question}</p>
                                                <p className="mt-1 text-sm text-dark-text-primary/90">{insight.answer}</p>
                                            </div>
                                        )) : <p className="text-sm text-dark-text-secondary">No specific AI insights generated for this article in the reports.</p>}
                                    </div>
                                </div>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
