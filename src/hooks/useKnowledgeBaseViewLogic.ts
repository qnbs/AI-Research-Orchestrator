import { useState, useCallback, useEffect } from 'react';
import { AggregatedArticle, KnowledgeBaseFilter } from '../types';
import { useUI } from '../contexts/UIContext';
import { useKnowledgeBase } from '../contexts/KnowledgeBaseContext';
import { useSettings } from '../contexts/SettingsContext';
import { exportKnowledgeBaseToPdf, exportToCsv, exportCitations } from '../services/exportService';

export const useKnowledgeBaseViewLogic = () => {
    const { setNotification, currentView } = useUI();
    const { knowledgeBase, uniqueArticles } = useKnowledgeBase();
    const { settings } = useSettings();

    const [selectedPmids, setSelectedPmids] = useState<string[]>([]);
    const [filter, setFilter] = useState<KnowledgeBaseFilter>({
        searchTerm: '',
        selectedTopics: [],
        selectedTags: [],
        selectedArticleTypes: [],
        selectedJournals: [],
        showOpenAccessOnly: false,
    });
    
    const [showExportModal, setShowExportModal] = useState<'pdf' | 'csv' | 'bib' | 'ris' | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        // Clear selection when navigating away from the knowledge base
        if (currentView !== 'knowledgeBase' && selectedPmids.length > 0) {
            setSelectedPmids([]);
        }
    }, [currentView, selectedPmids.length]);


    const handleFilterChange = useCallback((newFilter: Partial<KnowledgeBaseFilter>) => {
        setFilter(prev => ({ ...prev, ...newFilter }));
    }, []);

    const handleConfirmExport = useCallback(() => {
        if (!showExportModal) return;

        const articlesToExport: AggregatedArticle[] = uniqueArticles.filter(a => selectedPmids.includes(a.pmid));
        if (articlesToExport.length === 0) {
            setNotification({ id: Date.now(), message: 'No articles selected for export.', type: 'error' });
            return;
        }

        setIsExporting(true);
        // Timeout allows the UI to update before the potentially blocking export starts
        setTimeout(() => {
            try {
                switch (showExportModal) {
                    case 'pdf':
                        const findRelatedInsights = (pmid: string) => knowledgeBase.flatMap(e => e.sourceType === 'research' ? (e.report.aiGeneratedInsights || []) : []).filter(i => (i.supportingArticles || []).includes(pmid));
                        exportKnowledgeBaseToPdf(articlesToExport, 'Knowledge Base Selection', findRelatedInsights, settings.export.pdf);
                        break;
                    case 'csv':
                        exportToCsv(articlesToExport, 'knowledge_base_selection', settings.export.csv);
                        break;
                    case 'bib':
                    case 'ris':
                        exportCitations(articlesToExport, settings.export.citation, showExportModal);
                        break;
                }
                setNotification({ id: Date.now(), message: `Exported ${articlesToExport.length} articles as ${showExportModal.toUpperCase()}.`, type: 'success' });
            } catch (error) {
                console.error("Export failed:", error);
                setNotification({ id: Date.now(), message: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`, type: 'error' });
            } finally {
                setIsExporting(false);
                setShowExportModal(null);
            }
        }, 50);

    }, [showExportModal, selectedPmids, uniqueArticles, settings.export, setNotification, knowledgeBase]);

    return {
        selectedPmids,
        setSelectedPmids,
        filter,
        handleFilterChange,
        showExportModal,
        setShowExportModal,
        isExporting,
        handleConfirmExport
    };
};