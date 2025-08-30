import React, { useState, useId } from 'react';
import type { ResearchAnalysis, SimilarArticle, OnlineFindings } from '../types';
import { LoadingIndicator } from './LoadingIndicator';
import { BeakerIcon } from './icons/BeakerIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { SparklesIcon } from './icons/SparklesIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { WebIcon } from './icons/WebIcon';
import { DocumentIcon } from './icons/DocumentIcon';
import { XCircleIcon } from './icons/XCircleIcon';

interface ResearchViewProps {
    onStartNewReview: (topic: string) => void;
    onStartResearch: (queryText: string) => void;
    onClearResearch: () => void;
    isLoading: boolean;
    phase: string;
    error: string | null;
    analysis: ResearchAnalysis | null;
    similarArticlesState: { loading: boolean; error: string | null; articles: SimilarArticle[] | null };
    onlineFindingsState: { loading: boolean; error: string | null; findings: OnlineFindings | null };
}

const secureMarkdownToHtml = (text: string): string => {
    if (!text) return '';
    const rawMarkup = marked.parse(text.trim(), { breaks: true, gfm: true }) as string;
    return DOMPurify.sanitize(rawMarkup);
};

const AccordionSection: React.FC<{ title: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const id = useId();
  const panelId = `accordion-panel-${id}`;
  const buttonId = `accordion-button-${id}`;

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        id={buttonId}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="w-full flex justify-between items-center p-4 text-left text-lg font-semibold text-brand-accent hover:bg-surface-hover focus:outline-none transition-colors"
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
            <div className="p-4 bg-background/50">
                {children}
            </div>
        </div>
      </div>
    </div>
  );
};

const SkeletonLoader: React.FC<{ lines?: number; className?: string }> = ({ lines = 3, className = '' }) => (
    <div className={`space-y-3 animate-pulse ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
            <div key={i} className="p-3 rounded-md bg-surface border border-border/70">
                <div className="h-4 w-3/4 rounded bg-border"></div>
                <div className="mt-2 h-2 w-1/4 rounded bg-border"></div>
                <div className="mt-3 h-2 w-5/6 rounded bg-border"></div>
            </div>
        ))}
    </div>
);


export const ResearchView: React.FC<ResearchViewProps> = ({ 
    onStartNewReview, onStartResearch, onClearResearch, isLoading, phase, error, analysis,
    similarArticlesState, onlineFindingsState 
}) => {
    const [textQuery, setTextQuery] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onStartResearch(textQuery);
    };
    
    const hasResults = analysis || error;

    const renderContent = () => {
        if (isLoading) {
            return <div className="mt-8"><LoadingIndicator phase={phase} /></div>;
        }
        if (error) {
            return <div className="mt-8 text-center text-red-400 font-semibold p-8 bg-surface rounded-lg border border-red-500/20">{error}</div>;
        }
        if (analysis) {
            return (
                <div className="mt-8 bg-surface rounded-lg border border-border shadow-2xl shadow-black/20 animate-fadeIn">
                    <div className="p-4 flex justify-between items-center border-b border-border">
                         <h3 className="text-lg font-semibold text-text-primary">Analysis Complete</h3>
                         <button onClick={onClearResearch} className="flex items-center text-sm px-3 py-1.5 rounded-md text-text-primary bg-background hover:bg-surface-hover border border-border transition-colors">
                            <XCircleIcon className="h-4 w-4 mr-2" />
                            Clear Results
                        </button>
                    </div>
                    {analysis.summary && (
                        <AccordionSection title="AI-Generated Summary" defaultOpen>
                            <div className="prose prose-sm prose-invert max-w-none text-text-secondary/90 leading-relaxed" dangerouslySetInnerHTML={{ __html: secureMarkdownToHtml(analysis.summary) }} />
                        </AccordionSection>
                    )}
                    {analysis.keyFindings?.length > 0 && (
                        <AccordionSection title={<><SparklesIcon className="h-5 w-5 mr-2" />Key Findings</>} defaultOpen>
                            <ul className="list-disc pl-5 space-y-2 text-text-primary/90">
                                {analysis.keyFindings.map((finding, index) => (
                                    <li key={index}>{finding}</li>
                                ))}
                            </ul>
                        </AccordionSection>
                    )}

                    <AccordionSection title={<><BookOpenIcon className="h-5 w-5 mr-2" />Similar Scientific Articles</>} defaultOpen>
                        <div className="space-y-3">
                            {similarArticlesState.loading && <SkeletonLoader lines={3} />}
                            {similarArticlesState.error && <p className="text-red-400 text-sm text-center">{similarArticlesState.error}</p>}
                            {similarArticlesState.articles && similarArticlesState.articles.length === 0 && <p className="text-text-secondary text-sm text-center">No similar articles were found.</p>}
                            {similarArticlesState.articles && similarArticlesState.articles.map(similar => (
                                <div key={similar.pmid} className="bg-surface p-3 rounded-md border border-border/70 animate-fadeIn">
                                    <a href={`https://pubmed.ncbi.nlm.nih.gov/${similar.pmid}/`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-text-primary hover:text-brand-accent transition-colors">
                                        {similar.title}
                                    </a>
                                    <p className="mt-1 text-xs text-text-secondary/80 italic">PMID: {similar.pmid}</p>
                                    <p className="mt-2 text-xs text-text-secondary"><strong>Reasoning:</strong> {similar.reason}</p>
                                </div>
                            ))}
                        </div>
                    </AccordionSection>

                    <AccordionSection title={<><WebIcon className="h-5 w-5 mr-2" />Related Online Discussions</>} defaultOpen>
                        {onlineFindingsState.loading && <SkeletonLoader lines={1} className="p-3" />}
                        {onlineFindingsState.error && <p className="text-red-400 text-sm text-center">{onlineFindingsState.error}</p>}
                        {onlineFindingsState.findings && (
                            <div className="bg-surface p-3 rounded-md border border-border/70 animate-fadeIn">
                                <h5 className="font-semibold text-text-primary mb-2">Online Summary</h5>
                                <p className="text-sm text-text-secondary/90 mb-3">{onlineFindingsState.findings.summary}</p>
                                {onlineFindingsState.findings.sources.length > 0 && (
                                    <>
                                        <h6 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Sources</h6>
                                        <ul className="mt-2 space-y-1">
                                            {onlineFindingsState.findings.sources.map(source => (
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
                    </AccordionSection>

                    {analysis.synthesizedTopic && (
                        <div className="p-4 bg-background/50">
                            <div className="p-4 bg-surface border border-brand-accent/30 rounded-lg text-center">
                                <h4 className="font-semibold text-text-primary">Continue Your Research</h4>
                                <p className="text-sm text-text-secondary mt-1 mb-3">Use the synthesized topic below to start a full literature review.</p>
                                <code className="text-xs bg-background p-2 rounded-md text-brand-accent border border-border block truncate mb-3">{analysis.synthesizedTopic}</code>
                                <button
                                    onClick={() => onStartNewReview(analysis.synthesizedTopic)}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-brand-text-on-accent bg-brand-accent hover:bg-opacity-90"
                                >
                                    <DocumentIcon className="h-5 w-5 mr-2" />
                                    Start Full Review on This Topic
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            );
        }
        return (
            <div className="text-center text-text-secondary p-8 flex flex-col items-center justify-center h-full mt-10">
                <BeakerIcon className="h-24 w-24 text-border mb-6"/>
                <h2 className="text-2xl font-bold text-text-primary mb-3">Ask a question or analyze a paper.</h2>
                <p className="max-w-xl mx-auto text-base">
                    Paste in a research question, topic, abstract, or even a PMID/DOI. The AI will provide a concise summary, extract key findings, and find related articles for you.
                </p>
            </div>
        );
    };
    
    const isSubmitDisabled = isLoading || !textQuery.trim();

    return (
        <div className="max-w-4xl mx-auto animate-fadeIn">
            <div className="bg-surface rounded-lg border border-border shadow-2xl shadow-black/20 p-6">
                <h2 className="text-xl font-bold mb-4 text-brand-accent">Research Assistant</h2>
                <form onSubmit={handleSubmit}>
                    <textarea
                        value={textQuery}
                        onChange={(e) => setTextQuery(e.target.value)}
                        rows={5}
                        className="block w-full bg-background border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-brand-accent sm:text-sm placeholder-text-secondary"
                        placeholder="Enter a research question, abstract, a paper's full text, or a topic..."
                        disabled={isLoading || !!analysis}
                    />
                    <button
                        type="submit"
                        disabled={isSubmitDisabled || !!analysis}
                        className="w-full mt-4 inline-flex justify-center items-center py-2.5 px-4 border border-transparent shadow-sm text-sm font-semibold rounded-md text-brand-text-on-accent bg-brand-accent hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-brand-accent disabled:bg-border disabled:text-text-secondary disabled:cursor-not-allowed transition-colors"
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Analyzing...
                            </>
                        ) : (
                            <>
                                <BeakerIcon className="h-5 w-5 mr-2" />
                                Analyze
                            </>
                        )}
                    </button>
                </form>
            </div>

            {renderContent()}
        </div>
    );
};