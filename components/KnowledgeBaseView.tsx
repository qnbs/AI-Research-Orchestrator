import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import jsPDF from 'jspdf';
import type { AggregatedArticle, KnowledgeBaseEntry } from '../types';
import { SearchIcon } from './icons/SearchIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { UnlockIcon } from './icons/UnlockIcon';
import { PdfIcon } from './icons/PdfIcon';
import { TrashIcon } from './icons/TrashIcon';
import { CsvIcon } from './icons/CsvIcon';
import { ArticleDetailPanel } from './ArticleDetailPanel';
import { View } from './Header';
import { CitationIcon } from './icons/CitationIcon';
import { TagIcon } from './icons/TagIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';


interface KnowledgeBaseViewProps {
  entries: KnowledgeBaseEntry[];
  onClear: () => void;
  onViewChange: (view: View) => void;
  onDeleteSelected: (pmids: string[]) => void;
  onTagsUpdate: (pmid: string, tags: string[]) => void;
}

const PdfExportingOverlay: React.FC = () => (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm animate-fadeIn">
        <div className="flex flex-col items-center text-center p-8 bg-surface rounded-lg border border-border shadow-2xl">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-brand-accent mb-6"></div>
            <h2 className="text-xl font-semibold text-brand-accent mb-2">Generating PDF...</h2>
            <p className="text-text-secondary">This may take a moment.</p>
        </div>
    </div>
);

const MultiSelectFilter: React.FC<{ title: string, options: string[], selected: string[], onChange: (selected: string[]) => void }> = ({ title, options, selected, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [filter, setFilter] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);
    
    const handleOptionClick = (option: string) => {
        const newSelected = selected.includes(option)
            ? selected.filter(item => item !== option)
            : [...selected, option];
        onChange(newSelected);
    };

    const filteredOptions = useMemo(() => 
        options.filter(option => option.toLowerCase().includes(filter.toLowerCase())),
        [options, filter]
    );

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                type="button"
                onClick={() => setIsOpen(!isOpen)} 
                className="w-full flex justify-between items-center p-2 bg-background border border-border rounded-md text-sm font-medium text-text-primary hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-brand-accent"
            >
                <span className="truncate pr-2">{title} {selected.length > 0 && <span className="ml-1 bg-brand-accent text-brand-text-on-accent text-xs font-bold rounded-full px-2 py-0.5">{selected.length}</span>}</span>
                <ChevronDownIcon className={`w-5 h-5 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''} text-text-secondary`} />
            </button>
            {isOpen && (
                <div className="absolute z-10 mt-1 w-full bg-surface border border-border rounded-md shadow-lg max-h-60 overflow-hidden flex flex-col animate-fadeIn" style={{ animationDuration: '150ms' }}>
                    <div className="p-2 border-b border-border">
                        <input 
                            type="text"
                            placeholder="Filter options..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="w-full bg-background border border-border rounded-md py-1 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent"
                        />
                    </div>
                    <div className="overflow-y-auto p-1">
                        {filteredOptions.length > 0 ? filteredOptions.map(option => (
                            <label key={option} className="flex items-center space-x-2 p-1.5 rounded hover:bg-background cursor-pointer text-sm text-text-secondary truncate">
                                <input
                                    type="checkbox"
                                    checked={selected.includes(option)}
                                    onChange={() => handleOptionClick(option)}
                                    className="h-4 w-4 rounded border-border bg-background text-brand-accent focus:ring-brand-accent focus:ring-offset-surface flex-shrink-0"
                                />
                                <span title={option} className="truncate">{option}</span>
                            </label>
                        )) : <p className="p-2 text-sm text-text-secondary italic">No matching options.</p>}
                    </div>
                </div>
            )}
        </div>
    );
};


export const KnowledgeBaseView: React.FC<KnowledgeBaseViewProps> = ({ entries, onClear, onViewChange, onDeleteSelected, onTagsUpdate }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
    const [selectedReportTopics, setSelectedReportTopics] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [detailedArticle, setDetailedArticle] = useState<AggregatedArticle | null>(null);
    const [showOnlyOpenAccess, setShowOnlyOpenAccess] = useState(false);
    const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set());
    const [isExporting, setIsExporting] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: 'relevanceScore' | 'pubYear'; direction: 'asc' | 'desc' }>({ key: 'relevanceScore', direction: 'desc' });

    const { uniqueArticles, allKeywords, uniqueReportTopics, allTags } = useMemo(() => {
        const articleMap = new Map<string, AggregatedArticle>();
        const keywordMap = new Map<string, number>();
        const reportTopics = new Set<string>();
        const tags = new Set<string>();

        entries.forEach(entry => {
            const topic = entry.input.researchTopic;
            reportTopics.add(topic);
            entry.report.rankedArticles.forEach(article => {
                if (!articleMap.has(article.pmid) || article.relevanceScore > (articleMap.get(article.pmid)?.relevanceScore || 0)) {
                    articleMap.set(article.pmid, {
                        ...article,
                        sourceReportTopic: topic
                    });
                }
                article.customTags?.forEach(tag => tags.add(tag));
            });
             entry.report.overallKeywords.forEach(kw => {
                keywordMap.set(kw.keyword, (keywordMap.get(kw.keyword) || 0) + 1); // Simplified frequency
            });
        });
        
        const sortedKeywords = Array.from(keywordMap.keys()).sort();

        return {
            uniqueArticles: Array.from(articleMap.values()),
            allKeywords: sortedKeywords,
            uniqueReportTopics: Array.from(reportTopics),
            allTags: Array.from(tags).sort()
        };
    }, [entries]);
    
    const filteredArticles = useMemo(() => {
        return uniqueArticles.filter(article => {
            if (showOnlyOpenAccess && !article.isOpenAccess) return false;
            if (selectedReportTopics.length > 0 && !selectedReportTopics.includes(article.sourceReportTopic)) return false;

            const matchesSearch = searchTerm.toLowerCase() === '' ||
                article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                article.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
                article.authors.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesKeyword = selectedKeywords.length === 0 || selectedKeywords.some(kw => article.keywords.includes(kw));
            const matchesTag = selectedTags.length === 0 || selectedTags.some(tag => article.customTags?.includes(tag));

            return matchesSearch && matchesKeyword && matchesTag;
        }).sort((a, b) => {
            const valA = a[sortConfig.key];
            const valB = b[sortConfig.key];
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [uniqueArticles, searchTerm, selectedKeywords, showOnlyOpenAccess, selectedReportTopics, selectedTags, sortConfig]);

    const findRelatedInsights = useCallback((pmid: string) => {
        const insights: { question: string, answer: string, supportingArticles: string[] }[] = [];
        entries.forEach(entry => {
            entry.report.aiGeneratedInsights.forEach(insight => {
                if (insight.supportingArticles.includes(pmid)) {
                    insights.push(insight);
                }
            });
        });
        
        if (insights.length === 0) {
            return [];
        }

        // De-duplicate insights while merging supporting articles to provide complete context
        const insightMap = new Map<string, { question: string; answer: string; supportingArticles: Set<string> }>();
        for (const insight of insights) {
            const key = `${insight.question.trim()}-${insight.answer.trim()}`;
            const existing = insightMap.get(key);
            if (existing) {
                insight.supportingArticles.forEach(suppPmid => existing.supportingArticles.add(suppPmid));
            } else {
                insightMap.set(key, {
                    question: insight.question,
                    answer: insight.answer,
                    supportingArticles: new Set(insight.supportingArticles),
                });
            }
        }
        
        return Array.from(insightMap.values()).map(insight => ({
            ...insight,
            supportingArticles: Array.from(insight.supportingArticles).sort(),
        }));
    }, [entries]);

    const handleResetFilters = () => {
        setSearchTerm('');
        setSelectedKeywords([]);
        setSelectedReportTopics([]);
        setSelectedTags([]);
        setShowOnlyOpenAccess(false);
        setSortConfig({ key: 'relevanceScore', direction: 'desc' });
    };
    
    const handlePdfExport = () => {
        const articlesToExport = selectedArticles.size > 0
            ? uniqueArticles.filter(a => selectedArticles.has(a.pmid))
            : filteredArticles;

        if (articlesToExport.length === 0) {
            alert("No articles to export.");
            return;
        }

        setIsExporting('pdf');
        setTimeout(() => {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 15;
            const contentWidth = pageWidth - margin * 2;
            let y = 20;

            const checkPageBreak = (spaceNeeded: number) => {
                if (y + spaceNeeded > pageHeight - 20) { // leave margin at bottom
                    doc.addPage();
                    y = 20;
                }
            };

            // ---- PDF Header ----
            const title = selectedArticles.size > 0
                ? `${selectedArticles.size} Selected Articles`
                : `Report of ${filteredArticles.length} Filtered Articles`;

            doc.setFontSize(18).setFont('helvetica', 'bold').text('AI Research Orchestrator Export', pageWidth / 2, y, { align: 'center' });
            y += 8;
            doc.setFontSize(14).setFont('helvetica', 'normal').text(title, pageWidth / 2, y, { align: 'center' });
            y += 8;
            doc.setFontSize(10).setFont('helvetica', 'italic').setTextColor(128, 128, 128).text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, y, { align: 'center' });
            y += 15;

            // ---- Articles Loop ----
            articlesToExport.forEach((article, index) => {
                checkPageBreak(50); // Min space for an article header
                
                const articleLink = article.pmcId ? `https://www.ncbi.nlm.nih.gov/pmc/articles/${article.pmcId}/` : `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`;

                // Article Title
                doc.setFontSize(14).setFont('helvetica', 'bold').setTextColor(0, 0, 0);
                const titleLines = doc.splitTextToSize(`${index + 1}. ${article.title}`, contentWidth);
                doc.text(titleLines, margin, y);
                y += titleLines.length * 6 + 2;

                // Publication Info
                checkPageBreak(15);
                doc.setFontSize(10).setFont('helvetica', 'italic').setTextColor(80, 80, 80);
                const authorLines = doc.splitTextToSize(`Authors: ${article.authors}`, contentWidth);
                doc.text(authorLines, margin, y);
                y += authorLines.length * 4 + 1;
                const journalLines = doc.splitTextToSize(`Publication: ${article.journal} (${article.pubYear})`, contentWidth);
                doc.text(journalLines, margin, y);
                y += journalLines.length * 4 + 4;
                
                // Link
                checkPageBreak(10);
                doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(41, 128, 185).textWithLink('View on PubMed', margin, y, { url: articleLink });
                y += 8;

                // Summary
                checkPageBreak(15);
                doc.setFontSize(11).setFont('helvetica', 'bold').setTextColor(0, 0, 0).text('Summary', margin, y);
                y += 6;
                doc.setFontSize(10).setFont('helvetica', 'normal');
                const summaryLines = doc.splitTextToSize(article.summary, contentWidth);
                doc.text(summaryLines, margin, y);
                y += summaryLines.length * 5 + 5;
                
                // AI Insights
                const insights = findRelatedInsights(article.pmid);
                if (insights.length > 0) {
                    checkPageBreak(20);
                    doc.setFontSize(12).setFont('helvetica', 'bold').setTextColor(0, 0, 0).text('Related AI Insights', margin, y);
                    y += 7;
                    insights.forEach(insight => {
                        checkPageBreak(20);
                        doc.setFontSize(10).setFont('helvetica', 'bold');
                        const qLines = doc.splitTextToSize(insight.question, contentWidth - 5);
                        doc.text(qLines, margin + 5, y);
                        y += qLines.length * 5 + 1;

                        doc.setFont('helvetica', 'normal');
                        const aLines = doc.splitTextToSize(insight.answer, contentWidth - 5);
                        doc.text(aLines, margin + 5, y);
                        y += aLines.length * 5 + 3;
                    });
                }
                y += 5;

                // Separator
                if(index < articlesToExport.length - 1) {
                    checkPageBreak(10);
                    doc.setDrawColor(200).line(margin, y, pageWidth - margin, y);
                    y += 10;
                }
            });

            // ---- Page Numbers ----
            const pageCount = doc.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(9).setTextColor(128, 128, 128);
                doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
            }


            doc.save('article_export.pdf');
            setIsExporting(null);
        }, 50);
    };

    const handleCsvExport = () => {
        setIsExporting('csv');
        setTimeout(() => {
            const escapeCsvField = (field: any): string => {
                if (field === null || field === undefined) return '';
                let str = String(field);
                if (str.includes(',') || str.includes('"') || str.includes('\n')) str = `"${str.replace(/"/g, '""')}"`;
                return str;
            };

            const articlesToExport = filteredArticles.length > 0 ? filteredArticles : uniqueArticles;
            const headers = ['PMID', 'Title', 'Authors', 'Journal', 'PubYear', 'Summary', 'RelevanceScore', 'Keywords', 'CustomTags', 'SourceReportTopic'];
            const rows = articlesToExport.map(article => [
                article.pmid, article.title, article.authors, article.journal, article.pubYear, article.summary,
                article.relevanceScore, article.keywords.join('; '), article.customTags?.join('; ') || '', article.sourceReportTopic
            ].map(escapeCsvField).join(','));

            const csvContent = [headers.join(','), ...rows].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'research_export.csv';
            link.click();
            URL.revokeObjectURL(link.href);
            setIsExporting(null);
        }, 50);
    };
    
    const handleCitationExport = (format: 'bibtex' | 'ris') => {
        const selected = uniqueArticles.filter(a => selectedArticles.has(a.pmid));
        if (selected.length === 0) return;

        let content = '';
        let fileExt = '';

        if (format === 'bibtex') {
            fileExt = 'bib';
            content = selected.map(a => 
`@article{${a.pmid},
  author  = {${a.authors.split(',').join(' and ')}},
  title   = {${a.title}},
  journal = {${a.journal}},
  year    = {${a.pubYear}},
  pmid    = {${a.pmid}}
}`).join('\n\n');
        } else if (format === 'ris') {
            fileExt = 'ris';
            content = selected.map(a =>
`TY  - JOUR
${a.authors.split(',').map(author => `AU  - ${author.trim()}`).join('\n')}
TI  - ${a.title}
JO  - ${a.journal}
PY  - ${a.pubYear}
AB  - ${a.summary.replace(/\n/g, ' ')}
ID  - ${a.pmid}
ER  - `).join('\n\n');
        }
        
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `citations.${fileExt}`;
        link.click();
        URL.revokeObjectURL(link.href);
    };

    const handleSelectArticle = (pmid: string) => {
        setSelectedArticles(prev => { const newSet = new Set(prev); newSet.has(pmid) ? newSet.delete(pmid) : newSet.add(pmid); return newSet; });
    };
    
    const handleSelectAll = () => {
        const filteredPmids = new Set(filteredArticles.map(a => a.pmid));
        const allVisibleSelected = filteredArticles.length > 0 && Array.from(filteredPmids).every(pmid => selectedArticles.has(pmid));
        if (allVisibleSelected) setSelectedArticles(prev => { const newSet = new Set(prev); filteredPmids.forEach(pmid => newSet.delete(pmid)); return newSet; });
        else setSelectedArticles(prev => new Set([...prev, ...filteredPmids]));
    };

    const handleDeleteSelected = () => {
        if (window.confirm(`Are you sure you want to delete ${selectedArticles.size} selected article(s)? This action cannot be undone.`)) {
            onDeleteSelected(Array.from(selectedArticles));
            setSelectedArticles(new Set());
        }
    };
    
    const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const [key, direction] = e.target.value.split('-') as [('relevanceScore' | 'pubYear'), ('asc' | 'desc')];
        setSortConfig({ key, direction });
    };

    const areAllFilteredSelected = filteredArticles.length > 0 && filteredArticles.every(a => selectedArticles.has(a.pmid));
    const activeFiltersCount = [searchTerm, showOnlyOpenAccess].filter(Boolean).length + selectedKeywords.length + selectedReportTopics.length + selectedTags.length;
    const canExportPdf = (selectedArticles.size > 0 || filteredArticles.length > 0);
    
    if (entries.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center animate-fadeIn">
                <DatabaseIcon className="h-24 w-24 text-border mb-6"/>
                <h2 className="text-3xl font-bold text-text-primary mb-3">Your Knowledge Base is Empty</h2>
                <p className="max-w-md mx-auto text-lg text-text-secondary">
                    Start by running a query in the Orchestrator tab. Once you save a report, its articles will appear here.
                </p>
                <button 
                    onClick={() => onViewChange('orchestrator')} 
                    className="mt-8 inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-brand-text-on-accent bg-brand-accent hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-brand-accent"
                >
                    <SearchIcon className="h-5 w-5 mr-3" />
                    Go to Orchestrator
                </button>
            </div>
        );
    }

    return (
        <>
            {isExporting === 'pdf' && <PdfExportingOverlay />}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fadeIn">
                <div className="lg:col-span-1 bg-surface border border-border rounded-lg p-4 flex flex-col self-start sticky top-24">
                    <div className="flex-grow">
                        <h3 className="text-lg font-semibold text-brand-accent mb-4">Explorer</h3>
                        <div className="relative mb-4">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
                            <input type="text" placeholder="Search articles..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-background border border-border rounded-md py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-brand-accent" />
                        </div>
                        <div className="space-y-3">
                           <div className={`p-3 rounded-lg border transition-all duration-300 ${showOnlyOpenAccess ? 'bg-brand-accent/10 border-brand-accent/30' : 'bg-background border-border'}`}>
                                <label className="flex items-center justify-between cursor-pointer">
                                    <span className="flex items-center font-medium text-text-primary">
                                        <UnlockIcon className={`h-5 w-5 mr-2 transition-colors ${showOnlyOpenAccess ? 'text-green-400' : 'text-text-secondary'}`}/>
                                        Open Access Only
                                    </span>
                                    <div className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 ease-in-out ${showOnlyOpenAccess ? 'bg-brand-accent' : 'bg-gray-400 dark:bg-gray-600'}`}>
                                        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out ${showOnlyOpenAccess ? 'translate-x-6' : 'translate-x-1'}`}/>
                                        <input 
                                            type="checkbox" 
                                            checked={showOnlyOpenAccess} 
                                            onChange={() => setShowOnlyOpenAccess(!showOnlyOpenAccess)} 
                                            className="opacity-0 w-full h-full absolute cursor-pointer"
                                        />
                                    </div>
                                </label>
                                <p className="text-xs text-text-secondary mt-2">
                                    Show only articles marked as freely available to read.
                                </p>
                            </div>
                             <MultiSelectFilter title="Reports" options={uniqueReportTopics} selected={selectedReportTopics} onChange={setSelectedReportTopics} />
                             <MultiSelectFilter title="Keywords" options={allKeywords} selected={selectedKeywords} onChange={setSelectedKeywords} />
                             {allTags.length > 0 && <MultiSelectFilter title="Custom Tags" options={allTags} selected={selectedTags} onChange={setSelectedTags} />}
                        </div>
                        {activeFiltersCount > 0 && (<button onClick={handleResetFilters} className="text-sm text-brand-accent hover:underline w-full text-left mt-4">Reset {activeFiltersCount} Filters</button>)}
                    </div>
                     <div className="mt-4 pt-4 border-t border-border">
                        <button onClick={onClear} disabled={entries.length === 0} className="w-full flex items-center justify-center text-sm px-3 py-2 rounded-md text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors disabled:opacity-50">
                            <TrashIcon className="h-4 w-4 mr-2" />Clear Knowledge Base
                        </button>
                    </div>
                </div>

                <div className="lg:col-span-3">
                    <div className="p-4 border-b border-border sticky top-24 bg-surface/80 backdrop-blur-sm z-10 rounded-t-lg">
                        <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                             <h3 className="text-lg font-semibold text-brand-accent">{filteredArticles.length} Unique Articles</h3>
                             <div className="flex items-center gap-2">
                                <label htmlFor="sort-select" className="text-sm text-text-secondary">Sort by:</label>
                                <select id="sort-select" value={`${sortConfig.key}-${sortConfig.direction}`} onChange={handleSortChange} className="bg-background border border-border rounded-md text-sm py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-brand-accent">
                                    <option value="relevanceScore-desc">Relevance: High to Low</option>
                                    <option value="relevanceScore-asc">Relevance: Low to High</option>
                                    <option value="pubYear-desc">Year: Newest First</option>
                                    <option value="pubYear-asc">Year: Oldest First</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-background/50 border border-border rounded-md flex-wrap gap-3">
                           <div className="flex items-center">
                               <input id="select-all" type="checkbox" className="h-4 w-4 rounded border-border bg-surface text-brand-accent focus:ring-brand-accent" checked={areAllFilteredSelected} onChange={handleSelectAll} disabled={filteredArticles.length === 0} />
                               <label htmlFor="select-all" className="ml-3 text-sm text-text-secondary">Select all {filteredArticles.length > 0 ? filteredArticles.length : ''} visible</label>
                           </div>
                           <div className="flex items-center gap-2 flex-wrap">
                               {selectedArticles.size > 0 && (
                                   <>
                                        <button onClick={() => handleCitationExport('bibtex')} className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-brand-text-on-accent bg-brand-accent hover:bg-opacity-90">
                                            <CitationIcon className="h-4 w-4 mr-2" /> Export as BibTeX
                                        </button>
                                        <button onClick={() => handleCitationExport('ris')} className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-brand-text-on-accent bg-brand-accent hover:bg-opacity-90">
                                            <CitationIcon className="h-4 w-4 mr-2" /> Export as RIS
                                        </button>
                                       <button onClick={handleDeleteSelected} className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700">
                                           <TrashIcon className="h-4 w-4 mr-2" /> Delete ({selectedArticles.size})
                                       </button>
                                   </>
                               )}
                                <button onClick={handlePdfExport} disabled={!!isExporting || !canExportPdf} className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-brand-text-on-accent bg-brand-accent hover:bg-opacity-90 disabled:bg-border disabled:opacity-50 disabled:cursor-not-allowed"><PdfIcon className="h-4 w-4 mr-2"/>PDF</button>
                                <button onClick={handleCsvExport} disabled={!!isExporting} className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-brand-text-on-accent bg-brand-accent hover:bg-opacity-90 disabled:bg-border"><CsvIcon className="h-4 w-4 mr-2" />CSV</button>
                           </div>
                       </div>
                    </div>
                    <div className="p-4 space-y-3 bg-surface border border-t-0 border-border rounded-b-lg">
                        {filteredArticles.length > 0 ? filteredArticles.map(article => (
                            <div key={article.pmid} className={`relative p-4 rounded-md border flex items-center transition-all ${selectedArticles.has(article.pmid) ? 'bg-brand-accent/10 border-brand-accent' : 'bg-background border-border hover:border-brand-accent hover:bg-surface'}`}>
                                <input type="checkbox" className="h-4 w-4 rounded border-border bg-surface text-brand-accent focus:ring-brand-accent mr-4 flex-shrink-0" checked={selectedArticles.has(article.pmid)} onChange={() => handleSelectArticle(article.pmid)} onClick={(e) => e.stopPropagation()} />
                                <div onClick={() => setDetailedArticle(article)} className="cursor-pointer flex-grow">
                                    <div className="flex items-start">
                                        {article.isOpenAccess && <UnlockIcon className="h-5 w-5 text-green-400 mr-3 flex-shrink-0 mt-0.5" />}
                                        <div className="flex-grow">
                                            <h5 className="font-semibold text-text-primary">{article.title}</h5>
                                            <p className="text-xs text-text-secondary mt-1">{article.authors} - <span className="italic">{article.journal} ({article.pubYear})</span></p>
                                             {article.customTags && article.customTags.length > 0 && (
                                                <div className="mt-2 flex flex-wrap gap-2 items-center">
                                                    <TagIcon className="h-4 w-4 text-text-secondary" />
                                                    {article.customTags.map(tag => <span key={tag} className="bg-purple-500/10 text-purple-300 text-xs font-medium px-2 py-0.5 rounded-full border border-purple-500/20">{tag}</span>)}
                                                </div>
                                             )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )) : ( <div className="flex flex-col items-center justify-center min-h-[300px] text-center text-text-secondary p-8"><SearchIcon className="h-16 w-16 text-border mb-4"/> <h3 className="text-xl font-semibold">No Articles Found</h3><p>Try adjusting your search or filter criteria.</p></div>)}
                    </div>
                </div>

                {detailedArticle && <ArticleDetailPanel article={detailedArticle} onClose={() => setDetailedArticle(null)} findRelatedInsights={findRelatedInsights} onTagsUpdate={onTagsUpdate}/>}
            </div>
        </>
    );
};