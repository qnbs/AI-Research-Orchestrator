
import React, { useState } from 'react';
import type { ResearchReport, RankedArticle, ResearchInput } from '../types';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { UnlockIcon } from './icons/UnlockIcon';
import { SearchIcon } from './icons/SearchIcon';
import { BookmarkSquareIcon } from './icons/BookmarkSquareIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

interface ReportDisplayProps {
  report: ResearchReport;
  input: ResearchInput;
  isSaved: boolean;
  onSave: () => void;
}

const AccordionSection: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-4 text-left text-lg font-semibold text-brand-accent hover:bg-surface-hover focus:outline-none transition-colors"
      >
        <span>{title}</span>
        <ChevronDownIcon className={`h-6 w-6 transform transition-transform text-text-secondary ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="p-4 bg-background/50">
          {children}
        </div>
      )}
    </div>
  );
};

const ArticleCard: React.FC<{ article: RankedArticle, rank: number }> = ({ article, rank }) => {
    const scoreColor = article.relevanceScore > 75 ? 'text-green-400' : article.relevanceScore > 50 ? 'text-yellow-400' : 'text-red-400';
    const articleLink = article.pmcId 
      ? `https://www.ncbi.nlm.nih.gov/pmc/articles/${article.pmcId}/`
      : `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`;

    return (
        <div className="bg-surface rounded-md border border-border p-4 mb-4 transition-all duration-300 hover:border-brand-accent hover:shadow-lg hover:shadow-brand-accent/10">
            <div className="flex justify-between items-start">
                <div className="pr-4">
                    <h4 className="text-md font-bold text-text-primary">
                        <span className="text-text-secondary mr-2">#{rank}</span>
                        <a href={articleLink} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-brand-accent">{article.title}</a>
                    </h4>
                     {article.isOpenAccess && (
                        <div className="flex items-center mt-1 text-xs text-green-400">
                            <UnlockIcon className="h-4 w-4 mr-1.5"/>
                            Open Access
                        </div>
                    )}
                </div>
                <div className={`text-xl font-bold whitespace-nowrap ${scoreColor}`}>{article.relevanceScore} <span className="text-sm font-normal text-text-secondary">/ 100</span></div>
            </div>
            <p className="text-sm text-text-secondary mt-1">{article.authors}</p>
            <p className="text-sm text-text-secondary italic">{article.journal} ({article.pubYear})</p>
            <p className="mt-3 text-base text-text-primary/90 leading-relaxed">{article.summary}</p>
            <p className="mt-3 text-sm text-yellow-300 bg-yellow-500/10 border border-yellow-500/20 rounded p-3"><strong className="font-semibold text-yellow-200">Relevance:</strong> {article.relevanceExplanation}</p>
             <div className="mt-3 flex flex-wrap gap-2">
                {article.keywords.map(kw => (
                    <span key={kw} className="bg-sky-500/10 text-sky-300 text-xs font-medium px-2.5 py-0.5 rounded-full border border-sky-500/20">{kw}</span>
                ))}
            </div>
        </div>
    );
};


export const ReportDisplay: React.FC<ReportDisplayProps> = ({ report, input, isSaved, onSave }) => {
    if (report.rankedArticles.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-fadeIn">
                <SearchIcon className="h-24 w-24 text-border mb-6" />
                <h2 className="text-3xl font-bold text-text-primary mb-3">No Articles Found</h2>
                <p className="max-w-md mx-auto text-lg text-text-secondary">
                    The AI agents could not find any articles matching your specific criteria.
                </p>
                <p className="max-w-md mx-auto text-lg text-text-secondary mt-2">
                    Consider broadening your search parameters, such as extending the date range or selecting fewer article type restrictions.
                </p>
            </div>
        );
    }
    
    const dateRangeText: { [key: string]: string } = {
        'any': 'Any Time',
        '1': 'Last Year',
        '5': 'Last 5 Years',
        '10': 'Last 10 Years',
    };

    const synthesisFocusText: { [key: string]: string } = {
        'overview': 'Broad Overview',
        'clinical': 'Clinical Implications',
        'future': 'Future Research Directions',
        'gaps': 'Contradictions & Gaps'
    };

  return (
    <div className="animate-fadeIn">
      <div className="md:flex md:items-start md:justify-between mb-4">
        <div>
          <h2 className="text-3xl font-bold text-brand-accent">Literature Review Report</h2>
          <p className="text-lg text-text-primary mt-2"><strong>Topic:</strong> <span className="font-normal">{input.researchTopic}</span></p>
        </div>
        <div className="mt-4 md:mt-0 md:ml-6 flex-shrink-0">
            {isSaved ? (
                <div className="inline-flex items-center px-4 py-2 border border-green-500/20 text-sm font-medium rounded-md text-green-300 bg-green-500/10">
                    <CheckCircleIcon className="h-5 w-5 mr-2"/>
                    Saved in Knowledge Base
                </div>
            ) : (
                 <button onClick={onSave} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-semibold rounded-md shadow-sm text-brand-text-on-accent bg-brand-accent hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-brand-accent">
                    <BookmarkSquareIcon className="h-5 w-5 mr-2"/>
                    Save to Knowledge Base
                </button>
            )}
        </div>
      </div>
      
      <div className="mb-6 border-y border-border py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-2 text-sm text-text-secondary">
            <p><strong>Date Range:</strong> <span className="font-normal text-text-primary">{dateRangeText[input.dateRange]}</span></p>
            <p><strong>Article Types:</strong> <span className="font-normal text-text-primary">{input.articleTypes.join(', ') || 'Any'}</span></p>
            <p><strong>Synthesis Focus:</strong> <span className="font-normal text-text-primary">{synthesisFocusText[input.synthesisFocus]}</span></p>
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-text-primary mb-3">Key Report Themes</h3>
        <div className="flex flex-wrap gap-2">
            {report.overallKeywords.map(kw => (
                <span key={kw.keyword} className="bg-brand-primary/20 text-brand-accent text-sm font-medium px-3 py-1 rounded-full border border-brand-primary/30">
                    {kw.keyword} <span className="text-xs opacity-70 ml-1">({kw.frequency})</span>
                </span>
            ))}
        </div>
      </div>


      <AccordionSection title="Executive Synthesis" defaultOpen>
        <div className="prose prose-invert max-w-none text-text-primary/90 leading-relaxed">
            <p>{report.synthesis}</p>
        </div>
      </AccordionSection>

      <AccordionSection title="AI-Generated Insights" defaultOpen>
        <div className="space-y-4">
            {report.aiGeneratedInsights.map((qa, index) => (
                <div key={index} className="bg-surface p-4 rounded-md border border-border">
                    <p className="font-semibold text-brand-accent">{qa.question}</p>
                    <p className="mt-2 text-text-primary/90 leading-relaxed">{qa.answer}</p>
                    <p className="mt-3 text-xs text-text-secondary">
                        Supporting Evidence: {qa.supportingArticles.map(pmid => (
                            <a href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`} target="_blank" rel="noopener noreferrer" key={pmid} className="text-brand-accent hover:underline mr-2">PMID:{pmid}</a>
                        ))}
                    </p>
                </div>
            ))}
        </div>
      </AccordionSection>

      <AccordionSection title={`Top ${input.topNToSynthesize} Ranked Articles`}>
        <div>
            {report.rankedArticles.map((article, index) => (
                <ArticleCard key={article.pmid} article={article} rank={index + 1} />
            ))}
        </div>
      </AccordionSection>

      <AccordionSection title="Generated PubMed Queries">
        <div className="space-y-4">
            {report.generatedQueries.map((q, index) => (
                <div key={index} className="bg-surface p-4 rounded-md border border-border">
                    <p className="font-mono text-sm bg-background p-3 rounded break-words text-sky-300">{q.query}</p>
                    <p className="mt-2 text-sm text-text-secondary">{q.explanation}</p>
                </div>
            ))}
        </div>
      </AccordionSection>
    </div>
  );
};