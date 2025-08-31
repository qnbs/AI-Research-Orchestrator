import React, { useState, useId, useEffect, useRef, useCallback } from 'react';
import type { ResearchReport, RankedArticle, ResearchInput, AggregatedArticle, ChatMessage } from '../types';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { UnlockIcon } from './icons/UnlockIcon';
import { SearchIcon } from './icons/SearchIcon';
import { BookmarkSquareIcon } from './icons/BookmarkSquareIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { ClipboardDocumentListIcon } from './icons/ClipboardDocumentListIcon';
import { TagIcon } from './icons/TagIcon';
import { XIcon } from './icons/XIcon';
import { PdfIcon } from './icons/PdfIcon';
import { CsvIcon } from './icons/CsvIcon';
import { ConfirmationModal } from './ConfirmationModal';
import { exportToPdf, exportToCsv, exportInsightsToCsv } from '../services/exportService';
import { XCircleIcon } from './icons/XCircleIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { useSettings } from '../contexts/SettingsContext';
import { RelevanceScoreDisplay } from './RelevanceScoreDisplay';
import { AcademicCapIcon } from './icons/AcademicCapIcon';
import { WebIcon } from './icons/WebIcon';
import { useUI } from '../contexts/UIContext';
import { useKnowledgeBase } from '../contexts/KnowledgeBaseContext';
import { ExportIcon } from './icons/ExportIcon';
import { ChatInterface } from './ChatInterface';
import { ChatBubbleLeftRightIcon } from './icons/ChatBubbleLeftRightIcon';

interface ReportDisplayProps {
  report: ResearchReport;
  input: ResearchInput;
  isSaved: boolean;
  onSave: () => void;
  onNewSearch: () => void;
  onUpdateInput: (newInput: ResearchInput) => void;
  onTagsUpdate: (pmid: string, newTags: string[]) => void;
  chatHistory: ChatMessage[];
  isChatting: boolean;
  onSendMessage: (message: string) => void;
}

const secureMarkdownToHtml = (text: string): string => {
    if (!text) return '';
    const rawMarkup = marked.parse(text.trim(), { breaks: true, gfm: true }) as string;
    return DOMPurify.sanitize(rawMarkup);
};


const AccordionSection: React.FC<{ title: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean; count?: number }> = ({ title, children, defaultOpen = false, count }) => {
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
        className="w-full flex justify-between items-center p-4 text-left text-lg font-semibold text-text-primary hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent transition-colors group"
      >
        <div className="flex items-center gap-3">
          {title}
          {count !== undefined && <span className="text-sm font-medium bg-border text-text-secondary px-2 py-0.5 rounded-full">{count}</span>}
        </div>
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

const getSummaryLimit = () => {
    if (typeof window === 'undefined') return 250;
    if (window.innerWidth < 768) return 150;
    if (window.innerWidth < 1280) return 200;
    return 250;
};


const ArticleCard: React.FC<{ article: RankedArticle; rank: number; onTagsUpdate: (pmid: string, newTags: string[]) => void; }> = React.memo(({ article, rank, onTagsUpdate }) => {
    const { setNotification } = useUI();
    const [isExpanded, setIsExpanded] = useState(false);
    const [summaryCharLimit, setSummaryCharLimit] = useState(getSummaryLimit());
    const [tagInput, setTagInput] = useState('');

    useEffect(() => {
        const handleResize = () => setSummaryCharLimit(getSummaryLimit());
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const newTag = tagInput.trim();
            if (newTag && !(article.customTags || []).includes(newTag)) {
                onTagsUpdate(article.pmid, [...(article.customTags || []), newTag]);
                setTagInput('');
            }
        }
    };
    
    const handleRemoveTag = (tagToRemove: string) => {
        onTagsUpdate(article.pmid, (article.customTags || []).filter(tag => tag !== tagToRemove));
    };

    const articleLink = article.pmcId 
      ? `https://www.ncbi.nlm.nih.gov/pmc/articles/${article.pmcId}/`
      : `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`;

    const isLongSummary = article.summary.length > summaryCharLimit;

    const displayedSummary = isLongSummary && !isExpanded
        ? `${article.summary.substring(0, summaryCharLimit)}...`
        : article.summary;
    
    const handleCopy = (text: string, type: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setNotification({ id: Date.now(), message: `${type} copied to clipboard!`, type: 'success' });
        });
    };

    const googleScholarUrl = `https://scholar.google.com/scholar?q=${encodeURIComponent(article.title)}`;
    const semanticScholarUrl = `https://www.semanticscholar.org/search?q=${encodeURIComponent(article.title)}`;

    return (
        <div className="bg-background rounded-lg border border-border p-4 transition-all duration-200 hover:shadow-lg hover:border-brand-accent/30">
            <div className="flex justify-between items-start gap-4">
                <div className="flex-1 pr-4">
                    <a href={articleLink} target="_blank" rel="noopener noreferrer" className="text-lg font-semibold text-text-primary hover:text-brand-accent transition-colors">
                        <span className="text-text-secondary">{rank}. </span>{article.title}
                    </a>
                    <div className="mt-1 text-xs text-text-secondary">
                        <span>{article.authors}</span> &mdash; <span className="italic">{article.journal} ({article.pubYear})</span>
                    </div>
                     {article.isOpenAccess && (
                        <div className="mt-2 flex items-center text-xs text-green-400 font-medium">
                            <UnlockIcon className="h-4 w-4 mr-1.5" />
                            <span>Open Access</span>
                        </div>
                    )}
                </div>
                <RelevanceScoreDisplay score={article.relevanceScore} />
            </div>
           
            <p className="mt-3 text-sm text-text-secondary/90 leading-relaxed">
                <strong className="text-text-secondary">Summary: </strong>{displayedSummary}
                {isLongSummary && (
                    <button onClick={() => setIsExpanded(!isExpanded)} className="ml-2 text-brand-accent text-xs font-semibold hover:underline">
                        {isExpanded ? 'Show Less' : 'Show More'}
                    </button>
                )}
            </p>
            <p className="mt-2 text-xs text-text-secondary italic bg-surface-hover/50 p-2 rounded-md"><strong className="not-italic">Scoring rationale: </strong>{article.relevanceExplanation}</p>
            
            <div className="mt-3 space-y-3">
                <div className="flex flex-wrap gap-2">
                    {(article.keywords || []).map(kw => (
                        <span key={kw} className="bg-sky-500/10 text-sky-300 text-xs font-medium px-2.5 py-0.5 rounded-full border border-sky-500/20">{kw}</span>
                    ))}
                </div>
                
                 <div className="flex items-center justify-between pt-3 border-t border-border/50">
                    <div className="flex flex-wrap gap-2 items-center">
                        <TagIcon className="h-4 w-4 text-text-secondary flex-shrink-0" />
                        {(article.customTags || []).map(tag => (
                             <span key={tag} className="flex items-center bg-purple-500/10 text-purple-300 text-xs font-medium pl-2 pr-1 py-0.5 rounded-full border border-purple-500/20">
                                {tag}
                                <button onClick={() => handleRemoveTag(tag)} className="ml-1.5 text-purple-300 hover:text-white focus:outline-none" aria-label={`Remove tag ${tag}`}>
                                    <XIcon className="h-3 w-3"/>
                                </button>
                            </span>
                        ))}
                         <div className="flex-grow min-w-[120px]">
                            <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleTagInputKeyDown} placeholder="Add tag..." className="bg-background border-border border rounded-md py-0.5 px-2 text-xs w-full focus:outline-none focus:ring-1 focus:ring-brand-accent" />
                        </div>
                    </div>

                    <div className="flex items-center gap-4 text-text-secondary">
                         <a href={googleScholarUrl} target="_blank" rel="noopener noreferrer" className="hover:text-brand-accent" aria-label="Search on Google Scholar"><AcademicCapIcon className="h-5 w-5" /></a>
                        <a href={semanticScholarUrl} target="_blank" rel="noopener noreferrer" className="hover:text-brand-accent font-bold text-lg" aria-label="Search on Semantic Scholar">S</a>
                        <button onClick={() => handleCopy(article.pmid, 'PMID')} className="flex items-center hover:text-brand-accent transition-colors" aria-label="Copy PMID"><ClipboardIcon className="h-4 w-4" /></button>
                        <button onClick={() => handleCopy(`${article.authors}. (${article.pubYear}). ${article.title}. ${article.journal}. PMID: ${article.pmid}.`, 'Citation')} className="flex items-center hover:text-brand-accent transition-colors" aria-label="Copy Citation"><ClipboardDocumentListIcon className="h-4 w-4" /></button>
                    </div>
                </div>
            </div>
        </div>
    );
});


export const ReportDisplay: React.FC<ReportDisplayProps> = React.memo(({ report, input, isSaved, onSave, onNewSearch, onUpdateInput, onTagsUpdate, chatHistory, isChatting, onSendMessage }) => {
  const [modalState, setModalState] = useState<{ type: 'pdf' | 'csv' | 'insights' | 'save' } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const { settings } = useSettings();
  const { setNotification } = useUI();
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
              setIsExportMenuOpen(false);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePdfExport = () => {
      setIsExporting(true);
      setTimeout(() => {
          try {
              exportToPdf(report, input, settings.export.pdf);
          } catch (e) {
              console.error("PDF Export failed", e);
          } finally {
              setIsExporting(false);
              setModalState(null);
          }
      }, 50);
  };

  const handleCsvExport = () => {
      setIsExporting(true);
      setTimeout(() => {
          try {
              const aggregatedArticles: AggregatedArticle[] = report.rankedArticles.map(a => ({...a, sourceReportTopic: input.researchTopic}));
              exportToCsv(aggregatedArticles, input.researchTopic, settings.export.csv);
          } catch (e) {
              console.error("CSV Export failed", e);
          } finally {
              setIsExporting(false);
              setModalState(null);
          }
      }, 50);
  };

  const handleInsightsExport = () => {
      setIsExporting(true);
      setTimeout(() => {
          try {
              exportInsightsToCsv(report.aiGeneratedInsights, input.researchTopic);
          } catch (e) {
              console.error("Insights CSV Export failed", e);
          } finally {
              setIsExporting(false);
              setModalState(null);
          }
      }, 50);
  };
  
    const handleCopySynthesis = useCallback(() => {
        navigator.clipboard.writeText(report.synthesis).then(() => {
            setNotification({ id: Date.now(), message: 'Synthesis copied to clipboard!', type: 'success' });
        });
    }, [report.synthesis, setNotification]);

  return (
    <>
    <div className="animate-fadeIn bg-surface rounded-lg border border-border flex flex-col shadow-lg">
        <div className="flex-shrink-0 border-b border-border p-4 sm:p-6">
            <div className="flex justify-between items-start flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-text-primary">Research Report</h2>
                    <div className="mt-1 text-text-secondary max-w-xl flex items-center gap-2">
                        <span>Topic:</span>
                        {isSaved ? (
                            <span className="font-semibold text-text-primary">{input.researchTopic}</span>
                        ) : (
                            <input
                                type="text"
                                value={input.researchTopic}
                                onChange={(e) => onUpdateInput({ ...input, researchTopic: e.target.value })}
                                className="w-full bg-background border border-border rounded-md py-1 px-2 text-base font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-accent"
                                aria-label="Editable report title"
                            />
                        )}
                    </div>
                </div>
                 <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={onNewSearch} title="Start New Search" className="inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-md shadow-sm text-text-primary bg-surface hover:bg-surface-hover">
                        <XCircleIcon className="h-5 w-5 mr-2" />
                        New Search
                    </button>
                     <div className="relative" ref={exportMenuRef}>
                        <button onClick={() => setIsExportMenuOpen(prev => !prev)} title="Export options" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-brand-text-on-accent bg-brand-primary hover:bg-brand-secondary">
                            <ExportIcon className="h-5 w-5 mr-2" />
                            Export
                            <ChevronDownIcon className={`h-4 w-4 ml-1.5 transform transition-transform duration-200 ${isExportMenuOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isExportMenuOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-surface border border-border rounded-md shadow-lg z-10 animate-fadeIn" style={{ animationDuration: '150ms' }}>
                                <button onClick={() => { setModalState({ type: 'pdf' }); setIsExportMenuOpen(false); }} className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm hover:bg-surface-hover"><PdfIcon className="h-4 w-4" /> PDF</button>
                                <button onClick={() => { setModalState({ type: 'csv' }); setIsExportMenuOpen(false); }} className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm hover:bg-surface-hover"><CsvIcon className="h-4 w-4" /> CSV</button>
                                <button onClick={() => { setModalState({ type: 'insights' }); setIsExportMenuOpen(false); }} className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm hover:bg-surface-hover"><SparklesIcon className="h-4 w-4" /> Insights CSV</button>
                            </div>
                        )}
                     </div>
                    {isSaved ? (
                        <div className="flex items-center px-4 py-2 text-sm font-medium rounded-md text-green-300 bg-green-500/10 border border-green-500/20"><CheckCircleIcon className="h-5 w-5 mr-2" />Saved</div>
                    ) : (
                        <button onClick={() => setModalState({ type: 'save' })} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-brand-text-on-accent bg-brand-accent hover:bg-opacity-90"><BookmarkSquareIcon className="h-5 w-5 mr-2" />Save</button>
                    )}
                </div>
            </div>
        </div>

        <div className="flex-grow">
            <AccordionSection 
              title={
                <div className="flex items-center gap-3">
                  <span>Executive Synthesis</span>
                   <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleCopySynthesis();
                        }}
                        className="p-1.5 rounded-md text-text-secondary hover:bg-background hover:text-brand-accent opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Copy synthesis to clipboard"
                    >
                        <ClipboardIcon className="h-4 w-4" />
                    </button>
                </div>
              } 
              defaultOpen
            >
              <div className="prose prose-sm prose-invert max-w-none text-text-secondary/90 leading-relaxed" dangerouslySetInnerHTML={{ __html: secureMarkdownToHtml(report.synthesis) }} />
            </AccordionSection>
            <AccordionSection title="AI-Generated Insights" count={report.aiGeneratedInsights.length}>
                <div className="space-y-4">
                    {report.aiGeneratedInsights.map((insight, index) => (
                        <div key={index} className="bg-background p-3 rounded-md border border-border">
                            <p className="font-semibold text-brand-accent text-sm">{insight.question}</p>
                            <p className="mt-1 text-sm text-text-primary/90 leading-relaxed">{insight.answer}</p>
                            <div className="mt-3 pt-2 border-t border-border/50">
                                <p className="text-xs text-text-secondary font-semibold mb-1">Supporting Evidence (PMIDs):</p>
                                <div className="flex flex-wrap gap-x-3 gap-y-1 items-center">
                                    {(insight.supportingArticles || []).map(pmid => ( <a href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`} target="_blank" rel="noopener noreferrer" key={pmid} className="text-xs text-text-secondary hover:text-brand-accent hover:underline">{pmid}</a>))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </AccordionSection>
            
            <AccordionSection title="Overall Keywords & Themes" count={report.overallKeywords.length}>
                <div className="space-y-3 p-2">
                    {report.overallKeywords && report.overallKeywords.length > 0 ? (
                        report.overallKeywords.sort((a, b) => b.frequency - a.frequency).map((kw, index) => (
                            <div key={kw.keyword} className="grid grid-cols-4 items-center gap-4 text-sm animate-fadeIn" style={{ animationDelay: `${index * 50}ms` }}>
                                <span className="col-span-1 text-text-primary truncate font-medium" title={kw.keyword}>{kw.keyword}</span>
                                <div className="col-span-3 flex items-center">
                                    <div className="w-full bg-border rounded-full h-2.5 relative overflow-hidden">
                                        <div className="bg-gradient-to-r from-brand-secondary to-brand-accent h-2.5 rounded-full transition-all duration-500 ease-out" style={{ width: `${(kw.frequency / Math.max(1, report.rankedArticles.length)) * 100}%` }}></div>
                                    </div>
                                    <span className="ml-3 font-mono text-xs text-text-secondary w-10 text-right">{kw.frequency} / {report.rankedArticles.length}</span>
                                </div>
                            </div>
                        ))
                    ) : ( <p className="text-text-secondary italic">No overall keywords were identified.</p> )}
                </div>
            </AccordionSection>
            <AccordionSection title={`Ranked Articles`} count={report.rankedArticles.length}>
                <div className="space-y-4">
                    {report.rankedArticles.map((article, index) => ( <ArticleCard key={article.pmid} article={article} rank={index + 1} onTagsUpdate={onTagsUpdate} /> ))}
                </div>
            </AccordionSection>
            <AccordionSection title="Generated PubMed Queries" count={report.generatedQueries.length}>
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
            {report.sources && report.sources.length > 0 && (
                <AccordionSection title={<><WebIcon className="h-5 w-5 mr-3 text-brand-accent" />Sources Consulted by AI</>} count={report.sources.length}>
                    <div className="space-y-2">
                        <p className="text-xs text-text-secondary mb-3">The following web pages were consulted by the AI to generate this report. This provides traceability for the AI's findings.</p>
                        {report.sources.map((source, index) => (
                            <div key={index} className="bg-background p-2 rounded-md border border-border text-sm flex items-center gap-3">
                                <WebIcon className="h-4 w-4 text-text-secondary flex-shrink-0" />
                                <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:underline break-all" title={source.title}>{source.title || source.uri}</a>
                            </div>
                        ))}
                    </div>
                </AccordionSection>
            )}
            <AccordionSection 
                title={
                    <div className="flex items-center gap-3">
                        <ChatBubbleLeftRightIcon className="h-5 w-5 text-accent-cyan" />
                        <span>Chat with this Report</span>
                    </div>
                }
            >
                <ChatInterface 
                    history={chatHistory}
                    isChatting={isChatting}
                    onSendMessage={onSendMessage}
                />
            </AccordionSection>
        </div>
    </div>
    {modalState?.type === 'save' && <ConfirmationModal onConfirm={() => { onSave(); setModalState(null); }} onCancel={() => setModalState(null)} title="Save Report" message="Are you sure you want to save this report to your Knowledge Base?" confirmText="Save" confirmButtonClass="bg-brand-accent hover:bg-opacity-90" titleClass="text-brand-accent" />}
    {(modalState?.type === 'pdf' || modalState?.type === 'csv' || modalState?.type === 'insights') && (
        <ConfirmationModal
            onConfirm={() => {
                if (modalState.type === 'pdf') handlePdfExport();
                if (modalState.type === 'csv') handleCsvExport();
                if (modalState.type === 'insights') handleInsightsExport();
            }}
            onCancel={() => setModalState(null)}
            title="Confirm Export"
            message={modalState.type === 'insights' ? `You are about to export the ${report.aiGeneratedInsights.length} AI-generated insights as a CSV file. Continue?` : `You are about to export this report (${report.rankedArticles.length} articles) as a ${modalState.type.toUpperCase()} file. Continue?`}
            confirmText={isExporting ? 'Exporting...' : 'Yes, Export'}
            isConfirming={isExporting}
            confirmButtonClass="bg-brand-accent hover:bg-opacity-90"
            titleClass="text-brand-accent"
        />
    )}
    </>
  );
});
