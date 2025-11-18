
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useKnowledgeBaseView } from './KnowledgeBaseViewContext';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { UnlockIcon } from '../icons/UnlockIcon';
import { PdfIcon } from '../icons/PdfIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { CsvIcon } from '../icons/CsvIcon';
import { CitationIcon } from '../icons/CitationIcon';
import { GridViewIcon } from '../icons/GridViewIcon';
import { ListViewIcon } from '../icons/ListViewIcon';
import { XCircleIcon } from '../icons/XCircleIcon';
import { DocumentIcon } from '../icons/DocumentIcon';
import { RelevanceScoreDisplay } from '../RelevanceScoreDisplay';
import { useSettings } from '../../contexts/SettingsContext';
import { AggregatedArticle } from '../../types';

export const PdfExportingOverlay: React.FC = () => (
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

export const SidebarFilters: React.FC = () => {
    const { filter, onFilterChange, topics, tags, articleTypes, journals } = useKnowledgeBaseView();
    return (
        <aside className="w-64 flex-shrink-0 space-y-4 sticky top-24 self-start hidden md:block">
            <h3 className="text-lg font-semibold text-text-primary">Filters</h3>
            <div className="relative"><SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" /><input type="text" placeholder="Search articles..." value={filter.searchTerm} onChange={e => onFilterChange({ searchTerm: e.target.value })} className="w-full bg-input-bg border border-border rounded-md py-1.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"/></div>
            <MultiSelectFilter title="Topics" options={topics} selected={filter.selectedTopics} onChange={s => onFilterChange({ selectedTopics: s })} />
            <MultiSelectFilter title="Tags" options={tags} selected={filter.selectedTags} onChange={s => onFilterChange({ selectedTags: s })} />
            <MultiSelectFilter title="Article Types" options={articleTypes} selected={filter.selectedArticleTypes} onChange={s => onFilterChange({ selectedArticleTypes: s })} />
            <MultiSelectFilter title="Journals" options={journals} selected={filter.selectedJournals} onChange={s => onFilterChange({ selectedJournals: s })} />
            <label className="flex items-center cursor-pointer group"><div className="relative"><input type="checkbox" checked={filter.showOpenAccessOnly} onChange={e => onFilterChange({ showOpenAccessOnly: e.target.checked })} className="sr-only" /><div aria-hidden="true" className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center group-hover:border-brand-accent ${filter.showOpenAccessOnly ? 'bg-brand-accent border-brand-accent' : 'bg-surface border-border'}`}>{filter.showOpenAccessOnly && <UnlockIcon className="w-3 h-3 text-white" />}</div></div><span className="ml-3 text-sm font-medium text-text-primary group-hover:text-brand-accent transition-colors">Open Access Only</span></label>
        </aside>
    );
};

export const HeaderControls: React.FC = () => {
    const { filteredArticles, sortOrder, setSortOrder, viewMode, setViewMode } = useKnowledgeBaseView();
    return (
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
            <h2 className="text-2xl font-bold brand-gradient-text">{filteredArticles.length} Articles Found</h2>
            <div className="flex items-center gap-2">
                <select value={sortOrder} onChange={e => setSortOrder(e.target.value as any)} className="bg-input-bg border border-border rounded-md p-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent">
                    <option value="relevance">Sort by Relevance</option>
                    <option value="newest">Sort by Newest</option>
                </select>
                <div className="flex items-center bg-input-bg border border-border rounded-md p-1">
                    <button onClick={() => setViewMode('grid')} className={`p-1 rounded ${viewMode === 'grid' ? 'bg-brand-accent text-white' : 'hover:bg-surface'}`}><GridViewIcon className="h-5 w-5"/></button>
                    <button onClick={() => setViewMode('list')} className={`p-1 rounded ${viewMode === 'list' ? 'bg-brand-accent text-white' : 'hover:bg-surface'}`}><ListViewIcon className="h-5 w-5"/></button>
                </div>
            </div>
        </div>
    );
};

export const BulkActionsToolbar: React.FC = () => {
    const { selectedPmids, setSelectedPmids, handleSelectAll, setShowDeleteModal, setShowExportModal } = useKnowledgeBaseView();
    if (selectedPmids.length === 0) return null;

    return (
        <div className="sticky top-[112px] z-10 bg-surface/80 backdrop-blur-md p-3 rounded-lg border border-border mb-4 flex justify-between items-center shadow-lg animate-fadeIn" style={{ animationDuration: '200ms' }}>
            <div className="flex items-center gap-4"><button onClick={() => setSelectedPmids([])} className="p-1.5 rounded-full hover:bg-surface-hover"><XCircleIcon className="h-6 w-6 text-text-secondary"/></button><span className="font-semibold text-text-primary">{selectedPmids.length} selected</span><button onClick={handleSelectAll} className="text-sm font-semibold text-brand-accent hover:underline">Select All on Page</button></div>
            <div className="flex items-center gap-2"><button onClick={() => setShowDeleteModal(true)} className="p-2 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20"><TrashIcon className="h-5 w-5"/></button><button onClick={() => setShowExportModal('pdf')} className="p-2 rounded-md bg-surface hover:bg-surface-hover"><PdfIcon className="h-5 w-5"/></button><button onClick={() => setShowExportModal('csv')} className="p-2 rounded-md bg-surface hover:bg-surface-hover"><CsvIcon className="h-5 w-5"/></button><button onClick={() => setShowExportModal('bib')} className="p-2 rounded-md bg-surface hover:bg-surface-hover"><CitationIcon className="h-5 w-5"/></button></div>
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
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                <RelevanceScoreDisplay score={article.relevanceScore} />
                <div className="flex items-center gap-1 text-xs text-text-secondary truncate">
                    <DocumentIcon className="h-3 w-3" />
                    <span className="truncate" title={article.sourceTitle}>{article.sourceTitle}</span>
                </div>
            </div>
        </div>
    );
});

const KBArticleListItem: React.FC<{ article: AggregatedArticle; isSelected: boolean; onSelect: (pmid: string) => void; onView: (article: AggregatedArticle) => void; }> = React.memo(({ article, isSelected, onSelect, onView }) => {
    return (
        <div className={`flex items-start gap-4 p-4 border-b border-border last:border-b-0 group transition-colors ${isSelected ? 'bg-brand-accent/5' : 'hover:bg-surface-hover'}`}>
            <input type="checkbox" checked={isSelected} onChange={() => onSelect(article.pmid)} className="h-5 w-5 rounded border-border bg-surface text-brand-accent focus:ring-brand-accent mt-1 cursor-pointer" aria-label={`Select article: ${article.title}`} />
            <div className="flex-1">
                <button type="button" onClick={() => onView(article)} className="font-semibold text-text-primary text-left group-hover:text-brand-accent">{article.title}</button>
                <p className="text-xs text-text-secondary mt-1">{article.authors} - <span className="italic">{article.journal} ({article.pubYear})</span></p>
                <div className="flex flex-wrap gap-1 mt-2">
                    {(article.customTags || []).map(tag => ( <span key={tag} className="bg-purple-500/10 text-purple-300 text-xs font-medium px-2 py-0.5 rounded-full border border-purple-500/20">{tag}</span> ))}
                </div>
            </div>
            <div className="flex flex-col items-end gap-2">
                <RelevanceScoreDisplay score={article.relevanceScore} />
                {article.isOpenAccess && <div className="flex items-center text-xs text-green-400 font-medium"><UnlockIcon className="h-4 w-4 mr-1"/><span>OA</span></div>}
            </div>
        </div>
    );
});

export const ArticleList: React.FC = () => {
    const { viewMode, paginatedArticles, selectedPmids, handleSelect, setArticleInDetail } = useKnowledgeBaseView();

    if (viewMode === 'grid') {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {paginatedArticles.map(a => (
                    <KBArticleCard key={a.pmid} article={a} isSelected={selectedPmids.includes(a.pmid)} onSelect={handleSelect} onView={setArticleInDetail} />
                ))}
            </div>
        );
    }

    return (
        <div className="bg-surface border border-border rounded-lg">
            {paginatedArticles.map(a => (
                <KBArticleListItem key={a.pmid} article={a} isSelected={selectedPmids.includes(a.pmid)} onSelect={handleSelect} onView={setArticleInDetail} />
            ))}
        </div>
    );
};

export const Pagination: React.FC = () => {
    const { totalPages, currentPage, setCurrentPage } = useKnowledgeBaseView();
    if (totalPages <= 1) return null;
    
    return (
        <nav className="mt-6 flex items-center justify-center gap-4 text-sm font-medium">
            {currentPage > 1 && <button onClick={() => setCurrentPage(p => p - 1)} className="px-3 py-1 bg-surface border border-border rounded-md hover:bg-surface-hover">Previous</button>}
            <span>Page {currentPage} of {totalPages}</span>
            {currentPage < totalPages && <button onClick={() => setCurrentPage(p => p + 1)} className="px-3 py-1 bg-surface border border-border rounded-md hover:bg-surface-hover">Next</button>}
        </nav>
    );
};
