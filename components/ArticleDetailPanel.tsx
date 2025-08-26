import React, { useEffect, useState } from 'react';
import type { AggregatedArticle } from '../types';
import { XIcon } from './icons/XIcon';
import { UnlockIcon } from './icons/UnlockIcon';
import { TagIcon } from './icons/TagIcon';


interface ArticleDetailPanelProps {
    article: AggregatedArticle; 
    onClose: () => void;
    findRelatedInsights: (pmid: string) => { question: string, answer: string, supportingArticles: string[] }[];
    onTagsUpdate: (pmid: string, tags: string[]) => void;
}

export const ArticleDetailPanel: React.FC<ArticleDetailPanelProps> = ({ article, onClose, findRelatedInsights, onTagsUpdate }) => {
    const [tagInput, setTagInput] = useState('');
    const relatedInsights = findRelatedInsights(article.pmid);

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
    
    const handleAddTag = (e: React.FormEvent) => {
        e.preventDefault();
        const newTag = tagInput.trim();
        if (newTag && !(article.customTags || []).includes(newTag)) {
            onTagsUpdate(article.pmid, [...(article.customTags || []), newTag]);
            setTagInput('');
        }
    };
    
    const handleRemoveTag = (tagToRemove: string) => {
        onTagsUpdate(article.pmid, (article.customTags || []).filter(tag => tag !== tagToRemove));
    };

    const articleLink = article.pmcId 
      ? `https://www.ncbi.nlm.nih.gov/pmc/articles/${article.pmcId}/`
      : `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`;
      
    return (
         <div className="fixed inset-0 z-20" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/60 transition-opacity" onClick={onClose}></div>
            <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
                <div className="relative w-screen max-w-2xl">
                    <div className="absolute top-0 left-0 -ml-8 flex pt-4 pr-2 sm:-ml-10 sm:pr-4">
                        <button type="button" className="rounded-md text-gray-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-white" onClick={onClose}>
                            <XIcon className="h-6 w-6" />
                        </button>
                    </div>

                    <div className="flex h-full flex-col overflow-y-scroll bg-surface py-6 shadow-xl border-l border-border">
                        <div className="px-4 sm:px-6">
                           <div className="flex items-start justify-between">
                                <h2 className="text-xl font-bold text-brand-accent leading-6 pr-4" id="slide-over-title">
                                   <a href={articleLink} target="_blank" rel="noopener noreferrer" className="hover:underline">{article.title}</a>
                                </h2>
                                 <div className="text-right flex-shrink-0 ml-3">
                                    <span className={`text-xl font-bold ${article.relevanceScore > 75 ? 'text-green-400' : article.relevanceScore > 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                        {article.relevanceScore}
                                    </span>
                                    <span className="text-sm text-text-secondary">/100</span>
                                </div>
                            </div>
                              {article.isOpenAccess && ( <div className="mt-1 flex items-center text-sm text-green-400"><UnlockIcon className="h-4 w-4 mr-1.5"/>Open Access Article</div>)}
                        </div>
                        <div className="relative mt-6 flex-1 px-4 sm:px-6">
                            <div className="space-y-6">
                                <div>
                                    <p className="text-sm font-medium text-text-secondary">Authors</p>
                                    <p className="text-base text-text-primary">{article.authors}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-text-secondary">Publication</p>
                                    <p className="text-base text-text-primary italic">{article.journal} ({article.pubYear})</p>
                                </div>

                                <div className="pt-4 border-t border-border">
                                    <h4 className="font-semibold text-text-primary mb-2">Summary</h4>
                                    <p className="text-base text-text-primary/90 leading-relaxed">{article.summary}</p>
                                </div>
                                
                                 <div className="pt-4 border-t border-border">
                                    <h4 className="font-semibold text-text-primary mb-2">Keywords</h4>
                                     <div className="flex flex-wrap gap-2">
                                        {article.keywords.map(kw => ( <span key={kw} className="bg-sky-500/10 text-sky-300 text-xs font-medium px-2.5 py-0.5 rounded-full border border-sky-500/20">{kw}</span>))}
                                    </div>
                                </div>
                                
                                <div className="pt-4 border-t border-border">
                                    <h4 className="font-semibold text-text-primary mb-2 flex items-center"><TagIcon className="h-5 w-5 mr-2" /> Custom Tags</h4>
                                     <div className="flex flex-wrap gap-2 mb-3">
                                        {(article.customTags || []).map(tag => (
                                            <span key={tag} className="flex items-center bg-purple-500/10 text-purple-300 text-sm font-medium pl-3 pr-1 py-1 rounded-full border border-purple-500/20">
                                                {tag}
                                                <button onClick={() => handleRemoveTag(tag)} className="ml-2 text-purple-300 hover:text-white">
                                                    <XIcon className="h-3 w-3"/>
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
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};