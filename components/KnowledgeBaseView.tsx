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
            <button type="button" onClick={() => setIsOpen(!isOpen)} aria-haspopup="listbox" aria-expanded={isOpen} className="w-full flex justify-between items-center p-2 bg-background border border-border rounded-md text-sm font-medium text-text-primary hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-brand-accent">
                <span className="truncate pr-2">{title} {selected.length > 0 && <span className="ml-1 bg-brand-accent text-brand-text-on-accent text-xs font-bold rounded-full px-2 py-0.5">{selected.length}</span>}</span>
                <ChevronDownIcon className={`w-5 h-5 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''} text-text-secondary`} />
            </button>
            {isOpen && (
                <div className="absolute z-10 mt-1 w-full bg-surface border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    <div className="p-2"><input ref={searchInputRef} id="filter-search" type="text" placeholder="Search..." value={filterText} onChange={e => setFilterText(e.target.value)} className="w-full px-2 py-1 bg-background border border-border rounded-md text-sm mb-1"/></div>
                    <ul role="listbox" className="py-1">
                        {filteredOptions.map(option => (
                            <li key={option} role="option" aria-selected={selected.includes(option)}>
                                <label className="flex items-center px-3 py-2 text-sm text-text-primary hover:bg-surface-hover cursor-pointer">
                                    <input type="checkbox" checked={selected.includes(option)} onChange={() => handleOptionClick(option)} className="h-4 w-4 rounded border-border bg-background text-brand-accent focus:ring-brand-accent" />
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
                    <div className="flex-shrink-0"><input id={`select-${article.pmid}`} type="checkbox" checked={isSelected} onChange={() => onSelect(article.pmid)} className="h-5 w-5 rounded border-border bg-background text-brand-accent focus:ring-brand-accent cursor-pointer" aria-label={`Select article: ${article.title}`} /></div>
                </div>
                <p className={`text-text-secondary mb-3 ${densityClasses.text}`}>{article.authors} - <span className="italic">{article.journal} ({article.pubYear})</span></p>
                <div className={`flex flex-wrap ${densityClasses.gap} ${densityClasses.keywords}`}>
                    {article.keywords.slice(0, 3).map(kw => ( <span key={kw} className="bg-sky-500/10 text-sky-300 text-xs font-medium px-2 py-0.5 rounded-full border border-sky-500/20">{kw}</span> ))}
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
            <div><input id={`select-list-${article.pmid}`} type="checkbox" checked={isSelected} onChange={() => onSelect(article.pmid)} className="h-5 w-5 rounded border-border bg-background text-brand-accent focus:ring-brand-accent cursor-pointer" aria-label={`Select article: ${article.title}`} /></div>
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
    const activeFilters: { key: string; label: string; onRemove: () => void }[] = [];
    if (filter.searchTerm) activeFilters.push({ key: `search_${filter.searchTerm}`, label: `Search: "${filter.searchTerm}"`, onRemove: () => onFilterChange({ searchTerm: '' }) });
    filter.selectedTopics.forEach(topic => activeFilters.push({ key: `topic_${topic}`, label: `Topic: ${topic}`, onRemove: () => onFilterChange({ selectedTopics: filter.selectedTopics.filter(t => t !== topic) }) }));
    filter.selectedTags.forEach(tag => activeFilters.push({ key: `tag_${tag}`, label: `Tag: ${tag}`, onRemove: () => onFilterChange({ selectedTags: filter.selectedTags.filter(t => t !== tag) }) }));
    filter.selectedArticleTypes.forEach(type => activeFilters.push({ key: `type_${type}`, label: `Type: ${type}`, onRemove: () => onFilterChange({ selectedArticleTypes: filter.selectedArticleTypes.filter(t => t !== type) }) }));
    filter.selectedJournals.forEach(journal => activeFilters.push({ key: `journal_${journal}`, label: `Journal: ${journal.length > 20 ? journal.substring(0, 18) + '...' : journal}`, onRemove: () => onFilterChange({ selectedJournals: filter.selectedJournals.filter(j => j !== journal) }) }));
    if (filter.showOpenAccessOnly) activeFilters.push({ key: 'openAccess', label: 'Open Access Only', onRemove: () => onFilterChange({ showOpenAccessOnly: false }) });

    if (activeFilters.length === 0) return null;

    return (
        <div className="bg-surface border border-border rounded-lg p-3 mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 animate-fadeIn">
            <span className="text-sm font-semibold text-text-primary flex-shrink-0">Active Filters:</span>
            <div className="flex flex-wrap gap-2 flex-grow">
                {activeFilters.map(f => (
                    <span key={f.key} className="flex items-center bg-brand-accent/10 text-brand-accent text-xs font-medium pl-2 pr-1 py-1 rounded-full border border-brand-accent/20">
                        {f.label}
                        <button onClick={f.onRemove} className="ml-1.5 text-brand-accent hover:bg-brand-accent/20 rounded-full p-0.5" aria-label={`Remove filter ${f.label}`}><XIcon className="h-3 w-3" /></button>
                    </span>
                ))}
            </div>
            {activeFilters.length > 1 && <button onClick={onClear} className="flex items-center text-xs px-2 py-1 rounded-md text-text-secondary bg-background hover:bg-surface-hover border border-border transition-colors flex-shrink-0"><XCircleIcon className="h-3.5 w-3.5 mr-1.5" />Clear All</button>}
        </div>
    );
};
const ActiveFilters = memo(ActiveFiltersComponent);

export const KnowledgeBaseView: React.FC<KnowledgeBaseViewProps> = ({ onViewChange, filter, onFilterChange, selectedPmids, setSelectedPmids }) => {
    const { settings } = useSettings();
    const { knowledgeBase, uniqueArticles, deleteArticles } = useKnowledgeBase();
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
    
    const filterOptions = useMemo(() => {
        const topics = new Set<string>(), tags = new Set<string>(), types = new Set<string>(), journals = new Set<string>();
        uniqueArticles.forEach(article => {
            topics.add(article.sourceReportTopic);
            article.customTags?.forEach(tag => tags.add(tag));
            if(article.articleType) types.add(article.articleType);
            journals.add(article.journal);
        });
        return { topics: Array.from(topics).sort(), tags: Array.from(tags).sort(), articleTypes: Array.from(types).sort(), journals: Array.from(journals).sort((a,b) => a.localeCompare(b)) };
    }, [uniqueArticles]);

    const filteredArticles = useMemo(() => {
        let articles = uniqueArticles;
        if (filter.searchTerm) {
            const lowercasedTerm = filter.searchTerm.toLowerCase();
            articles = articles.filter(a => a.title.toLowerCase().includes(lowercasedTerm) || a.authors.toLowerCase().includes(lowercasedTerm) || a.summary.toLowerCase().includes(lowercasedTerm) || a.keywords.some(kw => kw.toLowerCase().includes(lowercasedTerm)));
        }
        if (filter.selectedTopics.length > 0) articles = articles.filter(a => filter.selectedTopics.includes(a.sourceReportTopic));
        if (filter.selectedTags.length > 0) articles = articles.filter(a => a.customTags && filter.selectedTags.some(t => a.customTags?.includes(t)));
        if (filter.selectedArticleTypes.length > 0) articles = articles.filter(a => a.articleType && filter.selectedArticleTypes.includes(a.articleType));
        if (filter.selectedJournals.length > 0) articles = articles.filter(a => filter.selectedJournals.includes(a.journal));
        if (filter.showOpenAccessOnly) articles = articles.filter(a => a.isOpenAccess);
        return articles.sort((a, b) => sortOrder === 'newest' ? parseInt(b.pubYear) - parseInt(a.pubYear) : b.relevanceScore - a.relevanceScore);
    }, [uniqueArticles, filter, sortOrder]);
    
    const handleSelectPmid = (pmid: string) => setSelectedPmids(prev => prev.includes(pmid) ? prev.filter(p => p !== pmid) : [...prev, pmid]);
    const findRelatedInsights = useCallback((pmid: string) => knowledgeBase.flatMap(entry => entry.report.aiGeneratedInsights || []).filter(insight => (insight.supportingArticles || []).includes(pmid)), [knowledgeBase]);

    const handleExportPdf = () => {
        const articlesToExport = selectedPmids.length > 0 ? uniqueArticles.filter(a => selectedPmids.includes(a.pmid)) : filteredArticles;
        if (articlesToExport.length === 0) { setNotification({ id: Date.now(), message: 'No articles selected to export.', type: 'error' }); return; }
        setIsExportingPdf(true);
        setTimeout(() => { try { exportKnowledgeBaseToPdf(articlesToExport, 'Knowledge Base Selection', findRelatedInsights, settings.export.pdf); } catch (error) { console.error("PDF Export failed:", error); } finally { setIsExportingPdf(false); } }, 50);
    };

    const handleExportCsv = () => {
        const articlesToExport = selectedPmids.length > 0 ? uniqueArticles.filter(a => selectedPmids.includes(a.pmid)) : filteredArticles;
        if (articlesToExport.length === 0) { setNotification({ id: Date.now(), message: 'No articles selected to export.', type: 'error' }); return; }
        exportToCsv(articlesToExport, 'knowledge_base', settings.export.csv);
    };

    const handleExportCitations = (type: 'bib' | 'ris') => {
        const articlesToExport = uniqueArticles.filter(a => selectedPmids.includes(a.pmid));
        if (articlesToExport.length === 0) { setNotification({ id: Date.now(), message: 'No articles selected to export.', type: 'error' }); return; }
        exportCitations(articlesToExport, settings.export.citation, type);
        setCitationExportModalType(null);
    };

    useEffect(() => { setCurrentPage(1); setSelectedPmids([]); }, [filter, sortOrder, setSelectedPmids]);
    const totalPages = Math.ceil(filteredArticles.length / ARTICLES_PER_PAGE);
    const paginatedArticles = filteredArticles.slice((currentPage - 1) * ARTICLES_PER_PAGE, currentPage * ARTICLES_PER_PAGE);

    const clearFilters = useCallback(() => onFilterChange({ searchTerm: '', selectedTopics: [], selectedTags: [], selectedArticleTypes: [], selectedJournals: [], showOpenAccessOnly: false }), [onFilterChange]);

    const allOnPageSelected = paginatedArticles.length > 0 && paginatedArticles.every(a => selectedPmids.includes(a.pmid));
    const someOnPageSelected = paginatedArticles.some(a => selectedPmids.includes(a.pmid)) && !allOnPageSelected;

    useEffect(() => { if (selectPageCheckboxRef.current) selectPageCheckboxRef.current.indeterminate = someOnPageSelected; }, [someOnPageSelected]);

    const handleSelectPage = () => {
        const pagePmids = paginatedArticles.map(a => a.pmid);
        if (allOnPageSelected) setSelectedPmids(prev => prev.filter(p => !pagePmids.includes(p)));
        else setSelectedPmids(prev => [...new Set([...prev, ...pagePmids])]);
    };
    
    if (uniqueArticles.length === 0) {
        return (
            <div className="h-[calc(100vh-200px)]">
                <EmptyState
                    icon={<DatabaseIcon className="h-24 w-24" />}
                    title="Knowledge Base is Empty"
                    message="Save reports from the Orchestrator tab to start building your research library and unlocking powerful data management features."
                    action={{
                        text: "Start First Report",
                        onClick: () => setCurrentView('orchestrator'),
                        icon: <DocumentPlusIcon className="h-5 w-5" />
                    }}
                />
            </div>
        );
    }
    
    return (
        <div className="animate-fadeIn">
             {isExportingPdf && <PdfExportingOverlay />}
             {selectedArticle && <ArticleDetailPanel article={selectedArticle} onClose={() => setSelectedArticle(null)} findRelatedInsights={findRelatedInsights} />}
             {showDeleteModal && <ConfirmationModal onConfirm={() => { deleteArticles(selectedPmids); setSelectedPmids([]); setShowDeleteModal(false); }} onCancel={() => setShowDeleteModal(false)} title={`Delete ${selectedPmids.length} Article(s)?`} message="Are you sure you want to permanently delete the selected articles from your knowledge base? This action cannot be undone." confirmText="Yes, Delete" />}
             {citationExportModalType && <ConfirmationModal onConfirm={() => handleExportCitations(citationExportModalType)} onCancel={() => setCitationExportModalType(null)} title="Export Citations" message={`Export ${selectedPmids.length} selected citations in ${citationExportModalType.toUpperCase()} format?`} confirmText="Export" confirmButtonClass="bg-brand-accent hover:bg-opacity-90" titleClass="text-brand-accent" />}
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-brand-accent">Knowledge Base</h1>
                <p className="mt-2 text-lg text-text-secondary">Search, filter, and manage all articles from your saved reports.</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <aside className="lg:col-span-1">
                    <div className="sticky top-24 space-y-6 bg-surface p-4 rounded-lg border border-border">
                        <h3 className="text-lg font-semibold text-text-primary border-b border-border pb-3">Filters</h3>
                        <MultiSelectFilter title="Report Topic" options={filterOptions.topics} selected={filter.selectedTopics} onChange={s => onFilterChange({ selectedTopics: s })} />
                        <MultiSelectFilter title="Custom Tags" options={filterOptions.tags} selected={filter.selectedTags} onChange={s => onFilterChange({ selectedTags: s })} />
                        <MultiSelectFilter title="Article Type" options={filterOptions.articleTypes} selected={filter.selectedArticleTypes} onChange={s => onFilterChange({ selectedArticleTypes: s })} />
                        <MultiSelectFilter title="Journal" options={filterOptions.journals} selected={filter.selectedJournals} onChange={s => onFilterChange({ selectedJournals: s })} />
                        <label className="flex items-center space-x-3 cursor-pointer text-sm font-medium text-text-primary"><input type="checkbox" checked={filter.showOpenAccessOnly} onChange={e => onFilterChange({ showOpenAccessOnly: e.target.checked })} className="h-4 w-4 rounded border-border bg-background text-brand-accent focus:ring-brand-accent" /><span>Show Open Access Only</span></label>
                        <button onClick={clearFilters} className="w-full flex items-center justify-center text-sm px-3 py-2 rounded-md text-text-primary bg-background hover:bg-surface-hover border border-border transition-colors"><XCircleIcon className="h-4 w-4 mr-2" />Clear All Filters</button>
                    </div>
                </aside>

                <main className="lg:col-span-3">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                        <div role="search" className="relative w-full md:w-auto md:flex-grow"><SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" /><input type="text" id="kb-search" placeholder={`Search ${uniqueArticles.length} articles...`} value={filter.searchTerm} onChange={e => onFilterChange({ searchTerm: e.target.value })} className="w-full bg-surface border border-border rounded-md py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-brand-accent" aria-label="Search knowledge base"/></div>
                        <div className="flex items-center gap-4 w-full md:w-auto justify-between">
                            <select id="kb-sort" aria-label="Sort articles" value={sortOrder} onChange={e => setSortOrder(e.target.value as any)} className="bg-surface border border-border rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"><option value="relevance">Sort by Relevance</option><option value="newest">Sort by Newest</option></select>
                             <div className="flex items-center bg-background p-1 rounded-lg border border-border">
                                <button onClick={() => setViewMode('grid')} aria-label="Grid View" className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-brand-accent text-brand-text-on-accent' : 'text-text-secondary hover:bg-surface'}`}><GridViewIcon className="h-5 w-5"/></button>
                                <button onClick={() => setViewMode('list')} aria-label="List View" className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-brand-accent text-brand-text-on-accent' : 'text-text-secondary hover:bg-surface'}`}><ListViewIcon className="h-5 w-5"/></button>
                            </div>
                        </div>
                    </div>
                    
                    <ActiveFilters filter={filter} onFilterChange={onFilterChange} onClear={clearFilters} />
                    <div aria-live="polite" role="status" className="sr-only">
                        {`Showing ${filteredArticles.length} articles matching your filters.`}
                    </div>
                    {selectedPmids.length > 0 && (
                        <div className="bg-surface border border-border rounded-lg p-3 mb-4 flex flex-col md:flex-row justify-between items-center gap-4 animate-fadeIn">
                             <p className="text-sm font-semibold text-text-primary">{selectedPmids.length} selected</p>
                             <div className="flex items-center gap-2 flex-wrap">
                                <button onClick={() => setShowDeleteModal(true)} className="flex items-center text-sm px-3 py-1.5 rounded-md text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20"><TrashIcon className="h-4 w-4 mr-2" />Delete</button>
                                <div className="h-5 w-px bg-border"></div>
                                <button onClick={handleExportPdf} className="flex items-center text-sm px-3 py-1.5 rounded-md text-text-primary bg-background hover:bg-surface-hover border border-border"><PdfIcon className="h-4 w-4 mr-2" />Export PDF</button>
                                <button onClick={handleExportCsv} className="flex items-center text-sm px-3 py-1.5 rounded-md text-text-primary bg-background hover:bg-surface-hover border border-border"><CsvIcon className="h-4 w-4 mr-2" />Export CSV</button>
                                <div className="relative">
                                    <button onClick={() => setIsCitationDropdownOpen(prev => !prev)} className="flex items-center text-sm px-3 py-1.5 rounded-md text-text-primary bg-background hover:bg-surface-hover border border-border"><CitationIcon className="h-4 w-4 mr-2" />Export Citations <ChevronDownIcon className="h-4 w-4 ml-1"/></button>
                                     {isCitationDropdownOpen && (
                                        <div className="absolute right-0 mt-2 w-40 bg-surface border border-border rounded-md shadow-lg z-10">
                                            <button onClick={() => { setIsCitationDropdownOpen(false); setCitationExportModalType('bib'); }} className="w-full text-left px-3 py-2 text-sm hover:bg-surface-hover">BibTeX (.bib)</button>
                                            <button onClick={() => { setIsCitationDropdownOpen(false); setCitationExportModalType('ris'); }} className="w-full text-left px-3 py-2 text-sm hover:bg-surface-hover">RIS (.ris)</button>
                                        </div>
                                     )}
                                </div>
                             </div>
                        </div>
                    )}

                    {paginatedArticles.length > 0 ? (
                        <>
                             <div className="border-b border-border pb-2 mb-2 flex items-center gap-3"><input ref={selectPageCheckboxRef} type="checkbox" id="select-all-on-page" checked={allOnPageSelected} onChange={handleSelectPage} className="h-4 w-4 rounded border-border bg-background text-brand-accent focus:ring-brand-accent" /><label htmlFor="select-all-on-page" className="text-sm text-text-secondary cursor-pointer">Select all on this page ({paginatedArticles.length})</label></div>
                            {viewMode === 'grid' ? (<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4">{paginatedArticles.map(article => <KBArticleCard key={article.pmid} article={article} isSelected={selectedPmids.includes(article.pmid)} onSelect={handleSelectPmid} onView={setSelectedArticle} />)}</div>) : (<div className="bg-surface border border-border rounded-lg overflow-hidden">{paginatedArticles.map(article => <ArticleListItem key={article.pmid} article={article} isSelected={selectedPmids.includes(article.pmid)} onSelect={handleSelectPmid} onView={setSelectedArticle} />)}</div>)}
                        </>
                    ) : (
                         <div className="text-center py-16"><SearchIcon className="h-16 w-16 text-border mx-auto mb-4" /><p className="text-lg font-semibold text-text-primary">No articles match your filters.</p><p className="text-text-secondary mt-1">Try adjusting your search or clearing some filters.</p></div>
                    )}
                    {totalPages > 1 && (<nav className="mt-8 flex justify-between items-center" aria-label="Pagination"><button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 text-sm rounded-md bg-surface border border-border disabled:opacity-50">Previous</button><span className="text-sm text-text-secondary" aria-live="polite" aria-atomic="true">Page {currentPage} of {totalPages}</span><button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 text-sm rounded-md bg-surface border border-border disabled:opacity-50">Next</button></nav>)}
                </main>
            </div>
        </div>
    );
};
