
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { useKnowledgeBase } from '../../contexts/KnowledgeBaseContext';
import { useUI } from '../../contexts/UIContext';
import { KnowledgeBaseFilter, AggregatedArticle } from '../../types';
import { View } from '../../contexts/UIContext';
import { exportKnowledgeBaseToPdf, exportToCsv, exportCitations } from '../../services/exportService';
import { useDebounce } from '../../hooks/useDebounce';

export const useKnowledgeBaseLogic = (
    onViewChange: (view: View) => void,
    filter: KnowledgeBaseFilter,
    onFilterChange: (newFilter: Partial<KnowledgeBaseFilter>) => void,
    selectedPmids: string[],
    setSelectedPmids: React.Dispatch<React.SetStateAction<string[]>>
) => {
    const { settings } = useSettings();
    const { knowledgeBase, uniqueArticles, deleteArticles, getArticles } = useKnowledgeBase();
    const { setNotification } = useUI();

    const [viewMode, setViewMode] = useState<'grid' | 'list'>(settings.knowledgeBase.defaultView);
    const [sortOrder, setSortOrder] = useState<'relevance' | 'newest'>(settings.knowledgeBase.defaultSort);
    const [currentPage, setCurrentPage] = useState(1);
    const [articleInDetail, setArticleInDetail] = useState<AggregatedArticle | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState<'pdf' | 'csv' | 'bib' | 'ris' | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    const debouncedSearchTerm = useDebounce(filter.searchTerm, 300);

    const { topics, tags, articleTypes, journals } = useMemo(() => {
        const topics = [...new Set(knowledgeBase.filter(e => e.sourceType === 'research').map(e => e.title))];
        const tags = [...new Set(uniqueArticles.flatMap(a => a.customTags || []))];
        const articleTypes = [...new Set(uniqueArticles.flatMap(a => a.articleType || []))];
        const journals = [...new Set(uniqueArticles.map(a => a.journal))];
        return { topics, tags, articleTypes, journals };
    }, [knowledgeBase, uniqueArticles]);

    const filteredArticles = useMemo(() => {
        let articles = [...uniqueArticles];
        if (debouncedSearchTerm) {
            const term = debouncedSearchTerm.toLowerCase();
            articles = articles.filter(a => a.title.toLowerCase().includes(term) || a.authors.toLowerCase().includes(term) || a.summary.toLowerCase().includes(term));
        }
        if (filter.selectedTopics.length > 0) articles = articles.filter(a => filter.selectedTopics.includes(a.sourceTitle));
        if (filter.selectedTags.length > 0) articles = articles.filter(a => filter.selectedTags.some(t => (a.customTags || []).includes(t)));
        if (filter.selectedArticleTypes.length > 0) articles = articles.filter(a => a.articleType && filter.selectedArticleTypes.includes(a.articleType));
        if (filter.selectedJournals.length > 0) articles = articles.filter(a => filter.selectedJournals.includes(a.journal));
        if (filter.showOpenAccessOnly) articles = articles.filter(a => a.isOpenAccess);

        return articles.sort((a, b) => sortOrder === 'newest' ? new Date(b.pubYear).getTime() - new Date(a.pubYear).getTime() : b.relevanceScore - a.relevanceScore);
    }, [uniqueArticles, filter, debouncedSearchTerm, sortOrder]);

    const articlesPerPage = settings.knowledgeBase.articlesPerPage;
    const totalPages = Math.ceil(filteredArticles.length / articlesPerPage);
    const paginatedArticles = filteredArticles.slice((currentPage - 1) * articlesPerPage, currentPage * articlesPerPage);

    const handleSelect = useCallback((pmid: string) => {
        setSelectedPmids(prev => prev.includes(pmid) ? prev.filter(id => id !== pmid) : [...prev, pmid]);
    }, [setSelectedPmids]);

    const handleSelectAll = useCallback(() => {
        if (selectedPmids.length === paginatedArticles.length) setSelectedPmids([]);
        else setSelectedPmids(paginatedArticles.map(a => a.pmid));
    }, [selectedPmids.length, paginatedArticles, setSelectedPmids]);

    const handleDelete = useCallback(async () => {
        await deleteArticles(selectedPmids);
        setSelectedPmids([]);
        setShowDeleteModal(false);
    }, [deleteArticles, selectedPmids, setSelectedPmids]);

    const findRelatedInsights = useCallback((pmid: string) => knowledgeBase.flatMap(e => e.sourceType === 'research' ? (e.report.aiGeneratedInsights || []) : []).filter(i => (i.supportingArticles || []).includes(pmid)), [knowledgeBase]);

    const handleConfirmExport = useCallback(() => {
        if (!showExportModal) return;
        setIsExporting(true);
        setTimeout(() => {
            try {
                const articlesToExport = uniqueArticles.filter(a => selectedPmids.includes(a.pmid));
                if (articlesToExport.length === 0) {
                    setNotification({ id: Date.now(), message: "No articles selected for export.", type: "error" });
                    return;
                }
                switch (showExportModal) {
                    case 'pdf': exportKnowledgeBaseToPdf(articlesToExport, 'Knowledge Base Selection', findRelatedInsights, settings.export.pdf); break;
                    case 'csv': exportToCsv(articlesToExport, 'kb_selection', settings.export.csv); break;
                    case 'bib': case 'ris': exportCitations(articlesToExport, settings.export.citation, showExportModal); break;
                }
                setNotification({ id: Date.now(), message: `Exported ${articlesToExport.length} articles as ${showExportModal.toUpperCase()}`, type: "success" });
            } catch (error) {
                setNotification({ id: Date.now(), message: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`, type: "error" });
            } finally {
                setIsExporting(false);
                setShowExportModal(null);
            }
        }, 50);
    }, [showExportModal, selectedPmids, uniqueArticles, setNotification, settings.export, findRelatedInsights]);

    return {
        viewMode, setViewMode,
        sortOrder, setSortOrder,
        currentPage, setCurrentPage,
        articleInDetail, setArticleInDetail,
        showDeleteModal, setShowDeleteModal,
        showExportModal, setShowExportModal,
        isExporting,
        topics, tags, articleTypes, journals,
        filteredArticles, paginatedArticles, totalPages,
        handleSelect, handleSelectAll, handleDelete,
        handleConfirmExport, findRelatedInsights,
        uniqueArticles,
        onFilterChange,
        filter,
        selectedPmids,
        setSelectedPmids,
        onViewChange
    };
};
