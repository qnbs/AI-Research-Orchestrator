import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import type { ResearchReport, AggregatedArticle } from '../types';
import { SearchIcon } from './icons/SearchIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { UnlockIcon } from './icons/UnlockIcon';
import { PdfIcon } from './icons/PdfIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ArticleDetailPanel } from './ArticleDetailPanel';
import { View } from './Header';


interface KnowledgeBaseViewProps {
  reports: ResearchReport[];
  onClear: () => void;
  onViewChange: (view: View) => void;
}

export const KnowledgeBaseView: React.FC<KnowledgeBaseViewProps> = ({ reports, onClear, onViewChange }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
    const [selectedReportTopic, setSelectedReportTopic] = useState<string | null>(null);
    const [detailedArticle, setDetailedArticle] = useState<AggregatedArticle | null>(null);
    const [showOnlyOpenAccess, setShowOnlyOpenAccess] = useState(false);
    const [isExportingPdf, setIsExportingPdf] = useState(false);

    const { uniqueArticles, allKeywords, uniqueReportTopics } = useMemo(() => {
        const articleMap = new Map<string, AggregatedArticle>();
        const keywordMap = new Map<string, number>();
        const reportTopics = new Set<string>();

        reports.forEach(report => {
            const topic = report.synthesis.substring(0, 70) + '...';
            reportTopics.add(topic);
            report.rankedArticles.forEach(article => {
                if (!articleMap.has(article.pmid) || article.relevanceScore > (articleMap.get(article.pmid)?.relevanceScore || 0)) {
                    articleMap.set(article.pmid, {
                        ...article,
                        sourceReportTopic: topic
                    });
                }
            });
            report.overallKeywords.forEach(kw => {
                keywordMap.set(kw.keyword, (keywordMap.get(kw.keyword) || 0) + kw.frequency);
            });
        });
        
        const sortedKeywords = Array.from(keywordMap.entries())
            .sort(([, freqA], [, freqB]) => freqB - freqA)
            .map(([keyword, frequency]) => ({ keyword, frequency }));

        return {
            uniqueArticles: Array.from(articleMap.values()),
            allKeywords: sortedKeywords,
            uniqueReportTopics: Array.from(reportTopics)
        };
    }, [reports]);
    
    const maxKeywordFrequency = useMemo(() => Math.max(...allKeywords.map(k => k.frequency), 1), [allKeywords]);

    const filteredArticles = useMemo(() => {
        return uniqueArticles.filter(article => {
            if (showOnlyOpenAccess && !article.isOpenAccess) return false;
            if (selectedReportTopic && article.sourceReportTopic !== selectedReportTopic) return false;

            const matchesSearch = searchTerm.toLowerCase() === '' ||
                article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                article.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
                article.authors.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesKeyword = !selectedKeyword || article.keywords.includes(selectedKeyword);

            return matchesSearch && matchesKeyword;
        }).sort((a, b) => b.relevanceScore - a.relevanceScore);
    }, [uniqueArticles, searchTerm, selectedKeyword, showOnlyOpenAccess, selectedReportTopic]);

    const findRelatedInsights = (pmid: string) => {
        const insights: { question: string, answer: string }[] = [];
        reports.forEach(report => {
            report.aiGeneratedInsights.forEach(insight => {
                if (insight.supportingArticles.includes(pmid)) {
                    insights.push({ question: insight.question, answer: insight.answer });
                }
            });
        });
        return insights;
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setSelectedKeyword(null);
        setSelectedReportTopic(null);
        setShowOnlyOpenAccess(false);
    };

    const handlePdfExport = () => {
        setIsExportingPdf(true);
        // Use a timeout to allow the UI to update before the blocking PDF generation starts
        setTimeout(() => {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 15;
            const contentWidth = pageWidth - margin * 2;
            let y = 20;

            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text('Open Access Article Summary', pageWidth / 2, y, { align: 'center' });
            y += 10;
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, y, { align: 'center' });
            y += 15;

            const articlesToExport = filteredArticles.filter(a => a.isOpenAccess);

            articlesToExport.forEach((article, index) => {
                 if (y > 260) {
                    doc.addPage();
                    y = 20;
                }
                
                const articleLink = article.pmcId 
                  ? `https://www.ncbi.nlm.nih.gov/pmc/articles/${article.pmcId}/`
                  : `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`;

                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                const titleLines = doc.splitTextToSize(`${index + 1}. ${article.title}`, contentWidth);
                doc.text(titleLines, margin, y);
                y += titleLines.length * 6;

                doc.setFontSize(10);
                doc.setFont('helvetica', 'italic');
                const authorLines = doc.splitTextToSize(`${article.authors} (${article.pubYear}) - ${article.journal}`, contentWidth);
                doc.text(authorLines, margin, y);
                y += authorLines.length * 5;

                doc.setTextColor(41, 128, 185);
                doc.textWithLink('View Full Text', margin, y, { url: articleLink });
                doc.setTextColor(0, 0, 0);
                y += 8;

                doc.setFont('helvetica', 'normal');
                const summaryLines = doc.splitTextToSize(`Summary: ${article.summary}`, contentWidth);
                doc.text(summaryLines, margin, y);
                y += summaryLines.length * 5 + 10;

                if(index < articlesToExport.length - 1) {
                    doc.setDrawColor(200);
                    doc.line(margin, y - 5, pageWidth - margin, y - 5);
                }
            });

            doc.save('open_access_summary.pdf');
            setIsExportingPdf(false);
        }, 50);
    };

    const activeFiltersCount = [searchTerm, selectedKeyword, selectedReportTopic, showOnlyOpenAccess].filter(Boolean).length;
    
    if (reports.length === 0) {
        return (
            <div className="text-center text-dark-text-secondary p-8 flex flex-col items-center justify-center h-[calc(100vh-200px)] animate-fadeIn">
                <DatabaseIcon className="h-24 w-24 text-dark-border mb-6"/>
                <h2 className="text-3xl font-bold text-dark-text-primary mb-3">Your Knowledge Base is Empty</h2>
                <p className="max-w-md mx-auto text-lg mb-6">
                    Generate a research report to start building your personal library of scientific articles and insights.
                </p>
                <button
                    onClick={() => onViewChange('orchestrator')}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-dark-bg bg-brand-accent hover:bg-opacity-90 focus:outline-none"
                >
                    Generate First Report
                </button>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fadeIn">
            {/* Left Panel: Filters */}
            <div className="lg:col-span-1 bg-dark-surface border border-dark-border rounded-lg p-4 flex flex-col self-start sticky top-24">
                <div className="flex-grow">
                    <h3 className="text-lg font-semibold text-brand-accent mb-4">Explorer</h3>
                    
                    {/* Search */}
                    <div className="relative mb-4">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-text-secondary" />
                        <input
                            type="text"
                            placeholder="Search articles..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-dark-bg border border-dark-border rounded-md shadow-sm py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                        />
                    </div>

                    {/* Filters Section */}
                    <div className="mb-4 border-t border-dark-border pt-4">
                        <h4 className="text-md font-semibold text-dark-text-primary mb-3">Filters</h4>
                        <label className="flex items-center justify-between cursor-pointer mb-3">
                            <span className="flex items-center font-semibold text-green-400">
                                <UnlockIcon className="h-5 w-5 mr-2"/>
                                Open Access Only
                            </span>
                            <div className="relative">
                                <input type="checkbox" className="sr-only peer" checked={showOnlyOpenAccess} onChange={() => setShowOnlyOpenAccess(!showOnlyOpenAccess)} />
                                <div className="w-11 h-6 bg-dark-bg rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                            </div>
                        </label>
                        {activeFiltersCount > 0 && (
                            <button onClick={handleClearFilters} className="text-sm text-brand-accent hover:underline w-full text-left">
                                Clear {activeFiltersCount} Filters
                            </button>
                        )}
                    </div>

                    {/* Reports Section */}
                    <div className="mb-4 border-t border-dark-border pt-4">
                        <h4 className="text-md font-semibold text-dark-text-primary mb-2">Reports</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            <button onClick={() => setSelectedReportTopic(null)} className={`w-full text-left p-2 rounded-md text-sm transition-colors ${!selectedReportTopic ? 'bg-brand-primary/20 text-brand-accent' : 'hover:bg-dark-bg'}`}>All Reports</button>
                            {uniqueReportTopics.map(topic => (
                                <button key={topic} onClick={() => setSelectedReportTopic(topic)} className={`w-full text-left p-2 rounded-md text-sm transition-colors truncate ${selectedReportTopic === topic ? 'bg-brand-primary/20 text-brand-accent' : 'hover:bg-dark-bg'}`}>{topic}</button>
                            ))}
                        </div>
                    </div>

                    {/* Keywords Section */}
                    <div className="border-t border-dark-border pt-4">
                        <h4 className="text-md font-semibold text-dark-text-primary mb-3">Top Keywords</h4>
                        <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto">
                            <button 
                                onClick={() => setSelectedKeyword(null)}
                                className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${!selectedKeyword ? 'bg-brand-accent border-brand-accent text-dark-bg' : 'bg-dark-bg border-dark-border hover:border-brand-accent text-dark-text-secondary'}`}
                            >
                                All
                            </button>
                            {allKeywords.map(({ keyword, frequency }) => {
                                const fontSize = 0.75 + (frequency / maxKeywordFrequency) * 0.5; // From 0.75rem to 1.25rem
                                return (
                                <button
                                    key={keyword}
                                    onClick={() => setSelectedKeyword(keyword)}
                                    style={{ fontSize: `${fontSize}rem`}}
                                    className={`font-medium px-2.5 py-1 rounded-full border transition-colors leading-tight ${selectedKeyword === keyword ? 'bg-brand-accent border-brand-accent text-dark-bg' : 'bg-dark-bg border-dark-border hover:border-brand-accent text-dark-text-secondary'}`}
                                >
                                    {keyword}
                                </button>
                            )})}
                        </div>
                    </div>
                </div>
                
                 {/* Clear Button */}
                <div className="mt-4 pt-4 border-t border-dark-border">
                    <button
                        onClick={onClear}
                        disabled={reports.length === 0}
                        className="w-full flex items-center justify-center text-sm px-3 py-2 rounded-md text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-transparent disabled:hover:bg-transparent disabled:text-dark-text-secondary disabled:border-dark-border"
                    >
                        <TrashIcon className="h-4 w-4 mr-2" />
                        Clear Knowledge Base
                    </button>
                </div>
            </div>

            {/* Right Panel: Article List */}
            <div className="lg:col-span-3">
                <div className="p-4 border-b border-dark-border sticky top-24 bg-dark-surface/80 backdrop-blur-sm flex justify-between items-center z-10 rounded-t-lg">
                    <h3 className="text-lg font-semibold text-brand-accent">
                        {filteredArticles.length} Unique Articles
                    </h3>
                    {filteredArticles.filter(a => a.isOpenAccess).length > 0 && (
                        <button onClick={handlePdfExport} disabled={isExportingPdf} className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-dark-bg bg-brand-accent hover:bg-opacity-90 focus:outline-none disabled:bg-dark-border disabled:cursor-not-allowed">
                            {isExportingPdf ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Exporting...
                                </>
                            ) : (
                                <>
                                    <PdfIcon className="h-4 w-4 mr-2" />
                                    Export {filteredArticles.filter(a => a.isOpenAccess).length} Open Access as PDF
                                </>
                            )}
                        </button>
                    )}
                </div>
                <div className="p-4 space-y-3 bg-dark-surface border border-t-0 border-dark-border rounded-b-lg">
                     {filteredArticles.length > 0 ? filteredArticles.map(article => (
                        <div
                            key={article.pmid}
                            onClick={() => setDetailedArticle(article)}
                            className="p-4 rounded-md border bg-dark-bg border-dark-border hover:border-brand-accent hover:bg-dark-surface cursor-pointer transition-all"
                        >
                            <div className="flex items-start">
                                {article.isOpenAccess && <UnlockIcon className="h-5 w-5 text-green-400 mr-3 flex-shrink-0 mt-0.5" />}
                                <div className="flex-grow">
                                    <h5 className="font-semibold text-dark-text-primary">{article.title}</h5>
                                    <p className="text-xs text-dark-text-secondary mt-1">{article.authors} - <span className="italic">{article.journal} ({article.pubYear})</span></p>
                                    <p className="text-sm text-dark-text-primary/70 mt-2 line-clamp-2">{article.summary}</p>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="flex flex-col items-center justify-center min-h-[300px] text-center text-dark-text-secondary p-8">
                           <SearchIcon className="h-16 w-16 text-dark-border mb-4"/>
                           <h3 className="text-xl font-semibold">No Articles Found</h3>
                           <p>Try adjusting your search or filter criteria.</p>
                       </div>
                    )}
                </div>
            </div>

            {detailedArticle && <ArticleDetailPanel article={detailedArticle} onClose={() => setDetailedArticle(null)} findRelatedInsights={findRelatedInsights}/>}
        </div>
    );
};
