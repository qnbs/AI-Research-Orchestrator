
import React, { useState, useId } from 'react';
import type { ResearchReport, RankedArticle, ResearchInput } from '../types';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { UnlockIcon } from './icons/UnlockIcon';
import { SearchIcon } from './icons/SearchIcon';
import { BookmarkSquareIcon } from './icons/BookmarkSquareIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';

interface ReportDisplayProps {
  report: ResearchReport;
  input: ResearchInput;
  isSaved: boolean;
  onSave: () => void;
}

const AccordionSection: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const id = useId();
  const panelId = `accordion-panel-${id}`;
  const buttonId = `accordion-button-${id}`;

  return (
    <div className="border-b border-border">
      <button
        id={buttonId}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="w-full flex justify-between items-center p-4 text-left text-lg font-semibold text-brand-accent hover:bg-surface-hover focus:outline-none transition-colors"
      >
        <span>{title}</span>
        <ChevronDownIcon className={`h-6 w-6 transform transition-transform duration-300 text-text-secondary ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        className={`overflow-hidden transition-[max-height,opacity] duration-500 ease-in-out ${isOpen ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="p-4 bg-background/50">
            {children}
        </div>
      </div>
    </div>
  );
};

const ArticleCard: React.FC<{ article: RankedArticle, rank: number }> = React.memo(({ article, rank }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    const scoreColor = article.relevanceScore > 75 ? 'text-green-400' : article.relevanceScore > 50 ? 'text-yellow-400' : 'text-red-400';
    const articleLink = article.pmcId 
      ? `https://www.ncbi.nlm.nih.gov/pmc/articles/${article.pmcId}/`
      : `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`;

    const SUMMARY_CHAR_LIMIT = 250;
    const isLongSummary = article.summary.length > SUMMARY_CHAR_LIMIT;

    const displayedSummary = isLongSummary && !isExpanded
        ? `${article.summary.substring(0, SUMMARY_CHAR_LIMIT)}...`
        : article.summary;

    const copyToClipboard = () => {
        const citation = `${article.authors}. (${article.pubYear}). ${article.title}. ${article.journal}. PMID: ${article.pmid}.`;
        navigator.clipboard.writeText(citation).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    };

    return (
        <div className="bg-background rounded-lg border border-border p-4 transition-shadow hover:shadow-lg">
            <div className="flex justify-between items-start">
                <div className="flex-1 pr-4">
                    <a href={articleLink} target="_blank" rel="noopener noreferrer" className="text-base font-semibold text-text-primary hover:text-brand-accent transition-colors">
                        <span className="text-text-secondary">{rank}. </span>{article.title}
                    </a>
                    <div className="mt-1 text-xs text-text-secondary">
                        <span>{article.authors}</span> &mdash; <span className="italic">{article.journal} ({article.pubYear})</span>
                    </div>
                </div>
                <div className="text-right flex-shrink-0">
                    <div className={`text-2xl font-bold ${scoreColor}`}>{article.relevanceScore}</div>
                    <div className="text-xs text-text-secondary">Relevance</div>
                </div>
            </div>
            {article.isOpenAccess && (
                <div className="mt-2 flex items-center text-sm text-green-400">
                    <UnlockIcon className="h-4 w-4 mr-1.5" />
                    <span>Open Access</span>
                </div>
            )}
            <p className="mt-3 text-sm text-text-secondary/90 leading-relaxed">
                <strong className="text-text-secondary">Summary: </strong>{displayedSummary}
                {isLongSummary && (
                    <button onClick={() => setIsExpanded(!isExpanded)} className="ml-2 text-brand-accent text-xs font-semibold hover:underline">
                        {isExpanded ? 'Show Less' : 'Show More'}
                    </button>
                )}
            </p>
            <p className="mt-2 text-sm text-text-secondary"><strong className="text-text-secondary">Scoring rationale: </strong>{article.relevanceExplanation}</p>
            <div className="mt-3 flex items-center justify-between">
                <div className="flex flex-wrap gap-2">
                    {article.keywords.map(kw => (
                        <span key={kw} className="bg-sky-500/10 text-sky-300 text-xs font-medium px-2.5 py-0.5 rounded-full border border-sky-500/20">{kw}</span>
                    ))}
                </div>
                <button
                    onClick={copyToClipboard}
                    className="flex items-center text-xs text-text-secondary hover:text-brand-accent transition-colors"
                    title="Copy Citation"
                >
                    {isCopied ? (
                        <>
                            <CheckCircleIcon className="h-4 w-4 mr-1.5 text-green-400"/> Copied!
                        </>
                    ) : (
                        <>
                            <ClipboardIcon className="h-4 w-4 mr-1.5" /> Copy
                        </>
                    )}
                </button>
            </div>
        </div>
    );
});


export const ReportDisplay: React.FC<ReportDisplayProps> = ({ report, input, isSaved, onSave }) => {
  return (
    <div className="animate-fadeIn h-full flex flex-col">
        <div className="flex-shrink-0 border-b border-border pb-4 mb-4">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-text-primary">Research Report</h2>
                {isSaved ? (
                    <div className="flex items-center px-4 py-2 text-sm font-medium rounded-md text-green-300 bg-green-500/10 border border-green-500/20">
                        <CheckCircleIcon className="h-5 w-5 mr-2" />
                        Saved in Knowledge Base
                    </div>
                ) : (
                    <button onClick={onSave} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-brand-text-on-accent bg-brand-accent hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-brand-accent">
                        <BookmarkSquareIcon className="h-5 w-5 mr-2" />
                        Save to Knowledge Base
                    </button>
                )}
            </div>
            <p className="mt-1 text-text-secondary">Topic: <span className="font-semibold text-text-primary">{input.researchTopic}</span></p>
        </div>

        <div className="flex-grow overflow-y-auto pr-2 -mr-2">
            <AccordionSection title="Executive Synthesis" defaultOpen>
              <div className="prose prose-sm prose-invert max-w-none text-text-secondary/90 leading-relaxed" dangerouslySetInnerHTML={{ __html: report.synthesis.replace(/\n/g, '<br />') }} />
            </AccordionSection>
            <AccordionSection title="AI-Generated Insights">
                <div className="space-y-4">
                    {report.aiGeneratedInsights.map((insight, index) => (
                        <div key={index} className="bg-background p-3 rounded-md border border-border">
                            <p className="font-semibold text-brand-accent text-sm">{insight.question}</p>
                            <p className="mt-1 text-sm text-text-primary/90 leading-relaxed">{insight.answer}</p>
                            <div className="mt-3 pt-2 border-t border-border/50">
                                <p className="text-xs text-text-secondary font-semibold mb-1">Supporting Evidence (PMIDs):</p>
                                <div className="flex flex-wrap gap-x-3 gap-y-1 items-center">
                                    {insight.supportingArticles.map(pmid => (
                                        <a href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`} target="_blank" rel="noopener noreferrer" key={pmid} className="text-xs text-text-secondary hover:text-brand-accent hover:underline">
                                            {pmid}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </AccordionSection>
            <AccordionSection title="Overall Keywords & Themes">
                <div className="space-y-3 p-2">
                    {report.overallKeywords && report.overallKeywords.length > 0 ? (
                        report.overallKeywords
                            .sort((a, b) => b.frequency - a.frequency)
                            .map((kw, index) => (
                                <div key={kw.keyword} className="grid grid-cols-4 items-center gap-4 text-sm animate-fadeIn" style={{ animationDelay: `${index * 50}ms` }}>
                                    <span className="col-span-1 text-text-primary truncate font-medium" title={kw.keyword}>{kw.keyword}</span>
                                    <div className="col-span-3 flex items-center">
                                        <div className="w-full bg-border rounded-full h-4 relative overflow-hidden">
                                            <div 
                                                className="bg-brand-accent h-4 rounded-full transition-all duration-500 ease-out" 
                                                style={{ width: `${(kw.frequency / Math.max(1, ...report.overallKeywords.map(k => k.frequency))) * 100}%` }}
                                            ></div>
                                        </div>
                                        <span className="ml-3 font-mono text-xs text-text-secondary w-6 text-right">{kw.frequency}</span>
                                    </div>
                                </div>
                            ))
                    ) : (
                        <p className="text-text-secondary italic">No overall keywords were identified.</p>
                    )}
                </div>
            </AccordionSection>
            <AccordionSection title={`Ranked Articles (Top ${report.rankedArticles.length})`}>
                <div className="space-y-4">
                    {report.rankedArticles.map((article, index) => (
                       <ArticleCard key={article.pmid} article={article} rank={index + 1} />
                    ))}
                </div>
            </AccordionSection>
            <AccordionSection title="Generated PubMed Queries">
                <div className="space-y-4">
                    {report.generatedQueries.map((q, index) => (
                        <div key={index} className="bg-background p-3 rounded-md border border-border">
                            <div className="flex items-start">
                                <SearchIcon className="h-5 w-5 text-brand-accent mr-3 mt-0.5 flex-shrink-0"/>
                                <div>
                                    <p className="font-mono text-sm text-text-primary bg-surface border border-border rounded px-2 py-1">{q.query}</p>
                                    <p className="mt-2 text-xs text-text-secondary">{q.explanation}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </AccordionSection>
        </div>
    </div>
  );
};