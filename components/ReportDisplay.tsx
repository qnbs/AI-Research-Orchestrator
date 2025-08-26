import React, { useState } from 'react';
import type { ResearchReport, RankedArticle, ResearchInput } from '../types';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { UnlockIcon } from './icons/UnlockIcon';

interface ReportDisplayProps {
  report: ResearchReport;
  input: ResearchInput;
}

const AccordionSection: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-dark-border">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-4 text-left text-lg font-semibold text-brand-accent hover:bg-white/5 focus:outline-none transition-colors"
      >
        <span>{title}</span>
        <ChevronDownIcon className={`h-6 w-6 transform transition-transform text-dark-text-secondary ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="p-4 bg-dark-bg/50">
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
        <div className="bg-dark-surface rounded-md border border-dark-border p-4 mb-4 transition-all duration-300 hover:border-brand-accent hover:shadow-lg hover:shadow-brand-accent/10">
            <div className="flex justify-between items-start">
                <div className="pr-4">
                    <h4 className="text-md font-bold text-dark-text-primary">
                        <span className="text-dark-text-secondary mr-2">#{rank}</span>
                        <a href={articleLink} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-brand-accent">{article.title}</a>
                    </h4>
                     {article.isOpenAccess && (
                        <div className="flex items-center mt-1 text-xs text-green-400">
                            <UnlockIcon className="h-4 w-4 mr-1.5"/>
                            Open Access
                        </div>
                    )}
                </div>
                <div className={`text-xl font-bold whitespace-nowrap ${scoreColor}`}>{article.relevanceScore} <span className="text-sm font-normal text-dark-text-secondary">/ 100</span></div>
            </div>
            <p className="text-sm text-dark-text-secondary mt-1">{article.authors}</p>
            <p className="text-sm text-dark-text-secondary italic">{article.journal} ({article.pubYear})</p>
            <p className="mt-3 text-base text-dark-text-primary/90 leading-relaxed">{article.summary}</p>
            <p className="mt-3 text-sm text-yellow-300 bg-yellow-500/10 border border-yellow-500/20 rounded p-3"><strong className="font-semibold text-yellow-200">Relevance:</strong> {article.relevanceExplanation}</p>
             <div className="mt-3 flex flex-wrap gap-2">
                {article.keywords.map(kw => (
                    <span key={kw} className="bg-sky-500/10 text-sky-300 text-xs font-medium px-2.5 py-0.5 rounded-full border border-sky-500/20">{kw}</span>
                ))}
            </div>
        </div>
    );
};


export const ReportDisplay: React.FC<ReportDisplayProps> = ({ report, input }) => {
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
      <h2 className="text-3xl font-bold mb-4 text-brand-accent">Literature Review Report</h2>
      <div className="mb-6 border-b border-dark-border pb-4">
        <p className="text-lg text-dark-text-primary mb-4"><strong>Topic:</strong> <span className="font-normal">{input.researchTopic}</span></p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-2 text-sm text-dark-text-secondary">
            <p><strong>Date Range:</strong> <span className="font-normal text-dark-text-primary">{dateRangeText[input.dateRange]}</span></p>
            <p><strong>Article Types:</strong> <span className="font-normal text-dark-text-primary">{input.articleTypes.join(', ') || 'Any'}</span></p>
            <p><strong>Synthesis Focus:</strong> <span className="font-normal text-dark-text-primary">{synthesisFocusText[input.synthesisFocus]}</span></p>
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-dark-text-primary mb-3">Key Report Themes</h3>
        <div className="flex flex-wrap gap-2">
            {report.overallKeywords.map(kw => (
                <span key={kw.keyword} className="bg-brand-primary/20 text-brand-accent text-sm font-medium px-3 py-1 rounded-full border border-brand-primary/30">
                    {kw.keyword} <span className="text-xs opacity-70 ml-1">({kw.frequency})</span>
                </span>
            ))}
        </div>
      </div>


      <AccordionSection title="Executive Synthesis" defaultOpen>
        <div className="prose prose-invert max-w-none text-dark-text-primary/90 leading-relaxed">
            <p>{report.synthesis}</p>
        </div>
      </AccordionSection>

      <AccordionSection title="AI-Generated Insights" defaultOpen>
        <div className="space-y-4">
            {report.aiGeneratedInsights.map((qa, index) => (
                <div key={index} className="bg-dark-surface p-4 rounded-md border border-dark-border">
                    <p className="font-semibold text-brand-accent">{qa.question}</p>
                    <p className="mt-2 text-dark-text-primary/90 leading-relaxed">{qa.answer}</p>
                    <p className="mt-3 text-xs text-dark-text-secondary">
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
                <div key={index} className="bg-dark-surface p-4 rounded-md border border-dark-border">
                    <p className="font-mono text-sm bg-dark-bg p-3 rounded break-words text-sky-300">{q.query}</p>
                    <p className="mt-2 text-sm text-dark-text-secondary">{q.explanation}</p>
                </div>
            ))}
        </div>
      </AccordionSection>
    </div>
  );
};
