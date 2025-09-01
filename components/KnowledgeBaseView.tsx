


import React, { useState, useMemo, useRef, useEffect, useCallback, memo } from 'react';
import { exportKnowledgeBaseToPdf, exportToCsv, exportCitations } from '../services/exportService';
import type { AggregatedArticle, KnowledgeBaseEntry, KnowledgeBaseFilter } from '../types';
import { SearchIcon } from './icons/SearchIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { UnlockIcon } from './icons/UnlockIcon';
import { PdfIcon } from './icons/PdfIcon';
import { TrashIcon } from './icons/TrashIcon';
import { CsvIcon } from './icons/CsvIcon';
import { ArticleDetailPanel } from './ArticleDetailPanel';
import { CitationIcon } from './icons/CitationIcon';
import { TagIcon } from './icons/TagIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { ConfirmationModal } from './ConfirmationModal';
import { GridViewIcon } from './icons/GridViewIcon';
import { ListViewIcon } from './icons/ListViewIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { useSettings } from '../contexts/SettingsContext';
import { RelevanceScoreDisplay } from './RelevanceScoreDisplay';
import { XIcon } from './icons/XIcon';
import { useKnowledgeBase } from '../contexts/KnowledgeBaseContext';
import { useUI } from '../contexts/UIContext';
import type { View } from '../contexts/UIContext';
import { EmptyState } from './EmptyState';
import { DocumentPlusIcon } from './icons/DocumentPlusIcon';
import { DocumentIcon } from './icons/DocumentIcon';
import { AuthorIcon } from './icons/AuthorIcon';

// FIX: Update component props to accept state lifted to App.tsx
interface KnowledgeBaseViewProps {
  onViewChange: (view: View) => void;
  filter: KnowledgeBaseFilter;
  onFilterChange: (newFilter: Partial<KnowledgeBaseFilter>) => void;
  selectedPmids: string[];
  setSelectedPmids: React.Dispatch<React.SetStateAction<string[]>>;
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
    const [filterText, setFilterText] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    
    useEffect(() => {
        if (isOpen && searchInputRef.current) setTimeout(() => searchInputRef.current?.focus(), 50);
    }, [isOpen]);

    const handleOptionClick = (option: string) => onChange(selected.includes(option) ? selected.filter(item => item !== option) : [...selected, option]);

    const filteredOptions = useMemo(() => options.filter(option => option.toLowerCase().includes(filterText.toLowerCase())), [options, filterText]);

    return (
        <div className="relative" ref={dropdownRef}>
            <button type="button" onClick={() => setIsOpen(!isOpen)} aria-haspopup="listbox" aria-expanded={isOpen} className="w-full flex justify-between items-center p-2 bg-input-bg border border-border rounded-md text-sm font-medium text-text-primary hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-brand-accent">
                <span className="truncate pr-2">{title} {selected.length > 0 && <span className="ml-1 bg-brand-accent text-brand-text-on-accent text-xs font-bold rounded-full px-2 py-0.5">{selected.length}</span>}</span>
                <ChevronDownIcon className={`w-5 h-5 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''} text-text-secondary`} />
            </button>
            {isOpen && (
                <div className="absolute z-10 mt-1 w-full bg-surface border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    <div className="p-2"><input ref={searchInputRef} id="filter-search" type="text" placeholder="Search..." value={filterText} onChange={e => setFilterText(e.target.value)} className="w-full px-2 py-1 bg-input-bg border border-border rounded-md text-sm mb-1"/></div>
                    <ul role="listbox" className="py-1">
                        {filteredOptions.map(option => (
                            <li key={option} role="option" aria-selected={selected.includes(option)}>
                                <label className="flex items-center px-3 py-2 text-sm text-text-primary hover:bg-surface-hover cursor-pointer">
                                    <input type="checkbox" checked={selected.includes(option)} onChange={() => handleOptionClick(option)} className="h-4 w-4 rounded border-border bg-input-bg text-brand-accent focus:ring-brand-accent" />
                                    <span className="ml-3 truncate" title={option}>{option}</span>
                                </label>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};


const KBArticleCard: React.FC<{ article: AggregatedArticle; isSelected: boolean; onSelect: (pmid: string) => void; onView: (article: AggregatedArticle) => void; }> = React.memo(({ article, isSelected, onSelect, onView }) => {
    const { settings } = useSettings();
    const densityClasses = settings.appearance.density === 'compact' ? { container: 'p-3', title: 'text-sm', text: 'text-xs', keywords: 'mb-2', gap: 'gap-1' } : { container: 'p-4', title: 'text-base', text: 'text-xs', keywords: 'mb-4', gap: 'gap-2' };

    return (
        <div className={`bg-surface border rounded-lg flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:-translate-y-1 text-left group ${isSelected ? 'border-brand-accent shadow-lg ring-2 ring-brand-accent/50' : 'border-border'} ${densityClasses.container}`}>
            <div>
                <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 pr-2"><button type="button" onClick={() => onView(article)} className={`font-bold text-text-primary text-left group-hover:text-brand-accent focus:outline-none focus:text-brand-accent ${densityClasses.title}`}>{article.title}</button></div>
                    <div className="flex-shrink-0"><input id={`select-${article.pmid}`} type="checkbox" checked={isSelected} onChange={() => onSelect(article.pmid)} className="h-5 w-5 rounded border-border bg-surface text-brand-accent focus:ring-brand-accent cursor-pointer" aria-label={`Select article: ${article.title}`} /></div>
                </div>
                <p className={`text-text-secondary mb-3 ${densityClasses.text}`}>{article.authors} - <span className="italic">{article.journal} ({article.pubYear})</span></p>
                <div className={`flex flex-wrap ${densityClasses.gap} ${densityClasses.keywords}`}>
                    {(article.keywords || []).slice(0, 3).map(kw => ( <span key={kw} className="bg-sky-500/10 text-sky-300 text-xs font-medium px-2 py-0.5 rounded-full border border-sky-500/20">{kw}</span> ))}
                </div>
            </div>
            <div className="border-t border-border/50 pt-3 flex justify-between items-center">
                 <RelevanceScoreDisplay score={article.relevanceScore} />
                <div className="flex items-center gap-3">
                    {article.isOpenAccess && <div title="Open Access"><UnlockIcon className="h-5 w-5 text-green-400" /></div>}
                    {(article.customTags && article.customTags.length > 0) && <div title={`${article.customTags.length} custom tag(s)`}><TagIcon className="h-5 w-5 text-purple-400" /></div>}
                </div>
            </div>
        </div>
    );
});


const ArticleListItem: React.FC<{ article: AggregatedArticle; isSelected: boolean; onSelect: (pmid: string) => void; onView: (article: AggregatedArticle) => void; }> = ({ article, isSelected, onSelect, onView }) => {
    const { settings } = useSettings();
    const densityClasses = settings.appearance.density === 'compact' ? { container: 'p-2 gap-2', title: 'text-sm', text: 'text-xs', icons: 'h-3 w-3' } : { container: 'p-3 gap-4', title: 'text-base', text: 'text-xs', icons: 'h-3.5 w-3.5' };
    
    return (
        <div className={`w-full grid grid-cols-[auto,1fr,auto] items-center border-b border-border transition-colors hover:bg-surface-hover text-left group ${isSelected ? 'bg-brand-accent/10' : ''} ${densityClasses.container}`}>
            <div><input id={`select-list-${article.pmid}`} type="checkbox" checked={isSelected} onChange={() => onSelect(article.pmid)} className="h-5 w-5 rounded border-border bg-surface text-brand-accent focus:ring-brand-accent cursor-pointer" aria-label={`Select article: ${article.title}`} /></div>
            <div className="min-w-0">
                 <button type="button" onClick={() => onView(article)} className={`font-semibold text-text-primary truncate text-left group-hover:text-brand-accent focus:outline-none focus:text-brand-accent ${densityClasses.title}`} title={article.title}>{article.title}</button>
                <p className={`text-text-secondary truncate ${densityClasses.text}`}>{article.authors}</p>
                <div className={`mt-2 flex items-center gap-4 text-xs text-text-secondary ${densityClasses.text}`}>
                    <span className="italic truncate" title={article.journal}>{article.journal} ({article.pubYear})</span>
                    {(article.customTags && article.customTags.length > 0) && (<div className="flex items-center gap-1.5" title={article.customTags.join(', ')}><TagIcon className={`${densityClasses.icons} text-purple-400`} /> <span>{article.customTags.length}</span></div>)}
                    {article.isOpenAccess && <div className="flex items-center gap-1.5" title="Open Access"><UnlockIcon className={`${densityClasses.icons} text-green-400`} /></div>}
                </div>
            </div>
            <div className="flex items-center"><RelevanceScoreDisplay score={article.relevanceScore} /></div>
        </div>
    );
};

const ActiveFiltersComponent: React.FC<{ filter: KnowledgeBaseFilter; onFilterChange: (newFilter: Partial<KnowledgeBaseFilter>) => void; onClear: () => void; }> = ({ filter, onFilterChange, onClear }) => {
    const activeFilters: { key: string; label: string; onRemove: () => void; title?: string; }[] = [];
    if (filter.searchTerm) activeFilters.push({ key: `search_${filter.searchTerm}`, label: `Search: "${filter.searchTerm}"`, onRemove: () => onFilterChange({ searchTerm: '' }) });
    filter.selectedTopics.forEach(topic => activeFilters.push({ key: `topic_${topic}`, label: `Source: ${topic}`, onRemove: () => onFilterChange({ selectedTopics: filter.selectedTopics.filter(t => t !== topic) }) }));
    filter.selectedTags.forEach(tag => activeFilters.push({ key: `tag_${tag}`, label: `Tag: ${tag}`, onRemove: () => onFilterChange({ selectedTags: filter.selectedTags.filter(t => t !== tag) }) }));
    filter.selectedArticleTypes.forEach(type => activeFilters.push({ key: `type_${type}`, label: `Type: ${type}`, onRemove: () => onFilterChange({ selectedArticleTypes: filter.selectedArticleTypes.filter(t => t !== type) }) }));
    filter.selectedJournals.forEach(journal => activeFilters.push({ key: `journal_${journal}`, title: journal, label: `Journal: ${journal.length > 20 ? journal.substring(0, 18) + '...' : journal}`, onRemove: () => onFilterChange({ selectedJournals: filter.selectedJournals.filter(j => j !== journal) }) }));
    if (filter.showOpenAccessOnly) activeFilters.push({ key: 'openAccess', label: 'Open Access Only', onRemove: () => onFilterChange({ showOpenAccessOnly: false }) });

    if (activeFilters.length === 0) return null;

    return (
        <div className="bg-surface border border-border rounded-lg p-3 mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 animate-fadeIn">
            <span className="text-sm font-semibold text-text-primary flex-shrink-0">Active Filters:</span>
            <div className="flex flex-wrap gap-2 flex-grow">
                {activeFilters.map(f => (
                    <span key={f.key} title={f.title} className="flex items-center bg-brand-accent/10 text-brand-accent text-xs font-medium pl-2 pr-1 py-1 rounded-full border border-brand-accent/20">
                        {f.label}
                        <button onClick={f.onRemove} className="ml-1.5 text-brand-accent hover:bg-brand-accent/20 rounded-full p-0.5" aria-label={`Remove filter ${f.label}`}><XIcon className="h-3 w-3" /></button>
                    </span>
                ))}
            </div>
            {activeFilters.length > 1 && <button onClick={onClear} className="flex items-center text-xs px-2 py-1 rounded-md text-text-secondary bg-surface hover:bg-surface-hover border border-border transition-colors flex-shrink-0"><XCircleIcon className="h-3.5 w-3.5 mr-1.5" />Clear All</button>}
        </div>
    );
};
const ActiveFilters = memo(ActiveFiltersComponent);

export const KnowledgeBaseView: React.FC<KnowledgeBaseViewProps> = ({ onViewChange, filter, onFilterChange, selectedPmids, setSelectedPmids }) => {
    const { settings } = useSettings();
    const { getArticles, knowledgeBase, deleteArticles } = useKnowledgeBase();
    const { setNotification, setCurrentView } = useUI();
    const ARTICLES_PER_PAGE = settings.knowledgeBase.articlesPerPage;

    const [sortOrder, setSortOrder] = useState<'relevance' | 'newest'>(settings.knowledgeBase.defaultSort);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedArticle, setSelectedArticle] = useState<AggregatedArticle | null>(null);
    const [isExportingPdf, setIsExportingPdf] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isCitationDropdownOpen, setIsCitationDropdownOpen] = useState(false);
    const [citationExportModalType, setCitationExportModalType] = useState<'bib' | 'ris' | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>(settings.knowledgeBase.defaultView);
    const selectPageCheckboxRef = useRef<HTMLInputElement>(null);
    const [activeSource, setActiveSource] = useState<'all' | 'research' | 'author'>('all');
    
    const filterOptions = useMemo(() => {
        const allArticles = getArticles('all');
        if (!Array.isArray(allArticles)) {
            return { topics: [], tags: [], articleTypes: [], journals: [] };
        }

        const topics = new Set<string>();
        const tags = new Set<string>();
        const types = new Set<string>();
        const journals = new Set<string>();

        allArticles.forEach(article => {
            if (article.sourceTitle) topics.add(article.sourceTitle);
            article.customTags?.forEach(tag => tags.add(tag));
            if (article.articleType) types.add(article.articleType);
            if (article.journal) journals.add(article.journal);
        });

        return {
            topics: Array.from(topics).sort(),
            tags: Array.from(tags).sort(),
            articleTypes: Array.from(types).sort(),
            journals: Array.from(journals).sort((a, b) => a.localeCompare(b))
        };
    }, [getArticles]);

    const filteredArticles = useMemo(() => {
        const articles = getArticles(activeSource);

        let filtered = articles;
        if (filter.searchTerm) {
            const lowercasedTerm = filter.searchTerm.toLowerCase();
            filtered = filtered.filter(a =>
                a.title.toLowerCase().includes(lowercasedTerm) ||
                a.authors.toLowerCase().includes(lowercasedTerm) ||
                a.summary.toLowerCase().includes(lowercasedTerm) ||
                (a.keywords || []).some(kw => kw.toLowerCase().includes(lowercasedTerm))
            );
        }
        if (filter.selectedTopics.length > 0) {
            filtered = filtered.filter(a => filter.selectedTopics.includes(a.sourceTitle));
        }
        if (filter.selectedTags.length > 0) {
            filtered = filtered.filter(a => a.customTags?.some(t => filter.selectedTags.includes(t)));
        }
        if (filter.selectedArticleTypes.length > 0) {
            filtered = filtered.filter(a => a.articleType && filter.selectedArticleTypes.includes(a.articleType));
        }
        if (filter.selectedJournals.length > 0) {
            filtered = filtered.filter(a => a.journal && filter.selectedJournals.includes(a.journal));
        }
        if (filter.showOpenAccessOnly) {
            filtered = filtered.filter(a => a.isOpenAccess);
        }
        return filtered;
    }, [getArticles, activeSource, filter]);

    const sortedArticles = useMemo(() => {
        return [...filteredArticles].sort((a, b) => {
            if (sortOrder === 'newest') {
                return parseInt(b.pubYear) - parseInt(a.pubYear);
            }
            return b.relevanceScore - a.relevanceScore; // Default to relevance
        });
    }, [filteredArticles, sortOrder]);

    const totalPages = Math.ceil(sortedArticles.length / ARTICLES_PER_PAGE);
    const paginatedArticles = useMemo(() => sortedArticles.slice((currentPage - 1) * ARTICLES_PER_PAGE, currentPage * ARTICLES_PER_PAGE), [sortedArticles, currentPage, ARTICLES_PER_PAGE]);

    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        } else if (currentPage === 0 && totalPages > 0) {
            setCurrentPage(1);
        }
    }, [currentPage, totalPages]);

    useEffect(() => {
        // Uncheck the "select page" checkbox when page or filters change
        if (selectPageCheckboxRef.current) {
            selectPageCheckboxRef.current.checked = false;
        }
    }, [currentPage, sortedArticles]);

    const clearFilters = useCallback(() => onFilterChange({ searchTerm: '', selectedTopics: [], selectedTags: [], selectedArticleTypes: [], selectedJournals: [], showOpenAccessOnly: false }), [onFilterChange]);

    const handleSelect = useCallback((pmid: string) => {
        setSelectedPmids(prev => prev.includes(pmid) ? prev.filter(p => p !== pmid) : [...prev, pmid]);
    }, [setSelectedPmids]);

    const handleSelectPage = (e: React.ChangeEvent<HTMLInputElement>) => {
        const pagePmids = paginatedArticles.map(a => a.pmid);
        if (e.target.checked) {
            setSelectedPmids(prev => [...new Set([...prev, ...pagePmids])]);
        } else {
            setSelectedPmids(prev => prev.filter(p => !pagePmids.includes(p)));
        }
    };
    
    const handleExportPdf = useCallback(async () => {
        if (selectedPmids.length === 0) return;
        setIsExportingPdf(true);
        const articlesToExport = sortedArticles.filter(a => selectedPmids.includes(a.pmid));
        const findRelatedInsights = (pmid: string) => knowledgeBase.flatMap(e => e.sourceType === 'research' ? (e.report.aiGeneratedInsights || []) : []).filter(i => (i.supportingArticles || []).includes(pmid));
        
        // Timeout allows the UI to update before the potentially blocking PDF generation starts
        setTimeout(() => {
            try {
                exportKnowledgeBaseToPdf(articlesToExport, 'Knowledge Base Selection', findRelatedInsights, settings.export.pdf);
            } catch (error) {
                console.error("PDF export failed:", error);
                setNotification({id: Date.now(), message: 'PDF export failed.', type: 'error'});
            } finally {
                setIsExportingPdf(false);
            }
        }, 50);
    }, [selectedPmids, sortedArticles, knowledgeBase, settings.export.pdf, setNotification]);

    const handleExportCsv = useCallback(() => {
        if (selectedPmids.length === 0) return;
        const articlesToExport = sortedArticles.filter(a => selectedPmids.includes(a.pmid));
        exportToCsv(articlesToExport, 'knowledge_base_selection', settings.export.csv);
    }, [selectedPmids, sortedArticles, settings.export.csv]);
    
    const handleCitationExport = useCallback(() => {
        if (selectedPmids.length === 0 || !citationExportModalType) return;
        const articlesToExport = sortedArticles.filter(a => selectedPmids.includes(a.pmid));
        exportCitations(articlesToExport, settings.export.citation, citationExportModalType);
        setCitationExportModalType(null);
    }, [selectedPmids, sortedArticles, settings.export.citation, citationExportModalType]);

    if (getArticles('all').length === 0) {
        return (
            <div className="h-[calc(100vh-200px)]">
                 <EmptyState
                    icon={<DatabaseIcon className="h-24 w-24" />}
                    title="Knowledge Base is Empty"
                    message="Save reports from the Orchestrator tab to start building your personal knowledge base."
                    action={{
                        text: "Start Research",
                        onClick: () => setCurrentView('orchestrator'),
                        icon: <DocumentPlusIcon className="h-5 w-5" />
                    }}
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col md:flex-row gap-8">
            {isExportingPdf && <PdfExportingOverlay />}
            {selectedArticle && <ArticleDetailPanel article={selectedArticle} onClose={() => setSelectedArticle(null)} findRelatedInsights={(pmid: string) => knowledgeBase.flatMap(e => e.sourceType === 'research' ? (e.report.aiGeneratedInsights || []) : []).filter(i => (i.supportingArticles || []).includes(pmid))} />}
            {showDeleteModal && (
                <ConfirmationModal onConfirm={() => { deleteArticles(selectedPmids); setShowDeleteModal(false); setSelectedPmids([]) }} onCancel={() => setShowDeleteModal(false)} title={`Delete ${selectedPmids.length} Articles?`} message={<>Are you sure you want to permanently delete the selected articles? This action cannot be undone.</>} confirmText="Yes, Delete" />
            )}
            {citationExportModalType && (
                 <ConfirmationModal onConfirm={handleCitationExport} onCancel={() => setCitationExportModalType(null)} title={`Export ${selectedPmids.length} Citations`} message={`Are you sure you want to export citations for the ${selectedPmids.length} selected articles as a ${citationExportModalType.toUpperCase()} file?`} confirmText="Yes, Export" confirmButtonClass="bg-brand-accent hover:bg-opacity-90" titleClass="text-brand-accent"/>
            )}

            <aside className="w-full md:w-64 lg:w-72 flex-shrink-0">
                <div className="sticky top-24 space-y-4">
                    <h2 className="text-xl font-bold text-text-primary">Knowledge Base</h2>
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
                        <input id="kb-search" type="text" placeholder="Search articles..." value={filter.searchTerm} onChange={e => onFilterChange({ searchTerm: e.target.value })} className="w-full pl-10 pr-4 py-2 bg-input-bg border border-border rounded-md text-sm" />
                    </div>
                     <div className="flex w-full bg-surface p-1 rounded-lg border border-border">
                        <button onClick={() => setActiveSource('all')} className={`w-1/3 p-1.5 rounded-md text-sm font-medium transition-colors ${activeSource === 'all' ? 'bg-brand-accent text-brand-text-on-accent' : 'text-text-secondary hover:bg-surface-hover'}`}>All</button>
                        <button onClick={() => setActiveSource('research')} className={`w-1/3 p-1.5 rounded-md text-sm font-medium transition-colors ${activeSource === 'research' ? 'bg-brand-accent text-brand-text-on-accent' : 'text-text-secondary hover:bg-surface-hover'}`}>Research</button>
                        <button onClick={() => setActiveSource('author')} className={`w-1/3 p-1.5 rounded-md text-sm font-medium transition-colors ${activeSource === 'author' ? 'bg-brand-accent text-brand-text-on-accent' : 'text-text-secondary hover:bg-surface-hover'}`}>Authors</button>
                    </div>
                    <MultiSelectFilter title="Source" options={filterOptions.topics} selected={filter.selectedTopics} onChange={selected => onFilterChange({ selectedTopics: selected })} />
                    <MultiSelectFilter title="Tags" options={filterOptions.tags} selected={filter.selectedTags} onChange={selected => onFilterChange({ selectedTags: selected })} />
                    <MultiSelectFilter title="Article Type" options={filterOptions.articleTypes} selected={filter.selectedArticleTypes} onChange={selected => onFilterChange({ selectedArticleTypes: selected })} />
                    <MultiSelectFilter title="Journal" options={filterOptions.journals} selected={filter.selectedJournals} onChange={selected => onFilterChange({ selectedJournals: selected })} />
                    <label className="flex items-center space-x-3 p-2 cursor-pointer">
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${filter.showOpenAccessOnly ? 'bg-brand-accent border-brand-accent' : 'bg-surface border-border'}`}>
                             {filter.showOpenAccessOnly && <UnlockIcon className="w-3 h-3 text-white"/>}
                        </div>
                        <span className="text-sm font-medium text-text-primary">Open Access Only</span>
                        <input id="open-access-filter" type="checkbox" checked={filter.showOpenAccessOnly} onChange={e => onFilterChange({ showOpenAccessOnly: e.target.checked })} className="sr-only" />
                    </label>
                </div>
            </aside>

            <main className="flex-1 min-w-0">
                <ActiveFilters filter={filter} onFilterChange={onFilterChange} onClear={clearFilters} />
                <div className="bg-surface border border-border rounded-lg shadow-lg">
                    <div className="p-3 flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-border">
                        <div className="flex items-center gap-4">
                            <input ref={selectPageCheckboxRef} id="select-page" type="checkbox" onChange={handleSelectPage} className="h-5 w-5 rounded border-border bg-surface text-brand-accent focus:ring-brand-accent" aria-label="Select all articles on this page"/>
                            <label htmlFor="select-page" className="text-sm font-medium text-text-primary">{selectedPmids.length > 0 ? `${selectedPmids.length} selected` : 'Select Page'}</label>
                            {selectedPmids.length > 0 && <button onClick={() => setSelectedPmids([])} className="text-xs text-brand-accent hover:underline">Clear Selection</button>}
                        </div>
                         <div className="flex items-center gap-2">
                             <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-brand-accent/20 text-brand-accent' : 'text-text-secondary hover:bg-surface-hover'}`}><GridViewIcon className="h-5 w-5"/></button>
                            <button onClick={() => setViewMode('list')} className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-brand-accent/20 text-brand-accent' : 'text-text-secondary hover:bg-surface-hover'}`}><ListViewIcon className="h-5 w-5"/></button>
                            <div className="w-px h-6 bg-border mx-1"></div>
                            <select id="sort-order" value={sortOrder} onChange={e => setSortOrder(e.target.value as any)} className="bg-input-bg border-border rounded-md text-sm p-2 focus:outline-none focus:ring-2 focus:ring-brand-accent">
                                <option value="relevance">Sort by Relevance</option>
                                <option value="newest">Sort by Newest</option>
                            </select>
                         </div>
                    </div>
                     {selectedPmids.length > 0 && (
                        <div className="p-3 bg-background/50 border-b border-border flex flex-wrap items-center justify-center gap-3 animate-fadeIn">
                             <button onClick={handleExportPdf} className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-md text-text-primary bg-surface hover:bg-surface-hover border border-border transition-colors"><PdfIcon className="h-4 w-4" />Export PDF</button>
                             <button onClick={handleExportCsv} className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-md text-text-primary bg-surface hover:bg-surface-hover border border-border transition-colors"><CsvIcon className="h-4 w-4"/>Export CSV</button>
                             <div className="relative">
                                <button onClick={() => setIsCitationDropdownOpen(!isCitationDropdownOpen)} className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-md text-text-primary bg-surface hover:bg-surface-hover border border-border transition-colors"><CitationIcon className="h-4 w-4" />Export Citation <ChevronDownIcon className="h-3 w-3"/></button>
                                {isCitationDropdownOpen && (
                                    <div className="absolute z-10 mt-1 w-full bg-surface border border-border rounded-md shadow-lg">
                                        <button onClick={() => { setCitationExportModalType('bib'); setIsCitationDropdownOpen(false); }} className="block w-full text-left px-3 py-2 text-xs hover:bg-surface-hover">BibTeX (.bib)</button>
                                        <button onClick={() => { setCitationExportModalType('ris'); setIsCitationDropdownOpen(false); }} className="block w-full text-left px-3 py-2 text-xs hover:bg-surface-hover">RIS (.ris)</button>
                                    </div>
                                )}
                            </div>
                            <button onClick={() => setShowDeleteModal(true)} className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-md text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors"><TrashIcon className="h-4 w-4" />Delete</button>
                        </div>
                     )}
                    
                    {paginatedArticles.length > 0 ? (
                         viewMode === 'grid' ? (
                            <div className="p-4 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                                {paginatedArticles.map(article => ( <KBArticleCard key={article.pmid} article={article} isSelected={selectedPmids.includes(article.pmid)} onSelect={handleSelect} onView={setSelectedArticle} />))}
                            </div>
                        ) : (
                            <div>{paginatedArticles.map(article => ( <ArticleListItem key={article.pmid} article={article} isSelected={selectedPmids.includes(article.pmid)} onSelect={handleSelect} onView={setSelectedArticle} /> ))}</div>
                        )
                    ) : (
                        <div className="text-center py-12 px-4"><p className="text-text-secondary">No articles match your current filters.</p></div>
                    )}

                    {totalPages > 1 && (
                        <div className="p-3 border-t border-border flex justify-center items-center gap-4 text-sm">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-md hover:bg-surface-hover disabled:opacity-50">&laquo; Prev</button>
                            <span className="font-semibold text-text-primary">Page {currentPage} of {totalPages}</span>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded-md hover:bg-surface-hover disabled:opacity-50">Next &raquo;</button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};