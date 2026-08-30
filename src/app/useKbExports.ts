import { useState, useCallback } from 'react';
import type { AggregatedArticle, KnowledgeBaseEntry, Settings } from '../types';
import type { TranslationKey } from '../i18n/translations';
import { exportKnowledgeBaseToPdf, exportToCsv, exportCitations } from '../services/exportService';
import { exportErrorUserMessage } from '../lib/exportSafety';

interface NotificationState {
  id: number;
  message: string;
  type: 'success' | 'error';
}

interface UseKbExportsArgs {
  uniqueArticles: AggregatedArticle[];
  selectedKbPmids: string[];
  knowledgeBase: KnowledgeBaseEntry[];
  exportSettings: Settings['export'];
  setNotification: (n: NotificationState | null) => void;
  t: (key: TranslationKey | (string & {}), values?: Record<string, string | number>) => string;
}

/**
 * Knowledge-base selection export modal state and confirm handler.
 */
export function useKbExports({
  uniqueArticles,
  selectedKbPmids,
  knowledgeBase,
  exportSettings,
  setNotification,
  t,
}: UseKbExportsArgs) {
  const [showExportModal, setShowExportModal] = useState<'pdf' | 'csv' | 'bib' | 'ris' | null>(
    null,
  );

  const handleExportSelection = useCallback((format: 'pdf' | 'csv' | 'bib' | 'ris') => {
    setShowExportModal(format);
  }, []);

  const handleConfirmExport = useCallback(() => {
    if (!showExportModal) return;

    const articlesToExport: AggregatedArticle[] = uniqueArticles.filter((a) =>
      selectedKbPmids.includes(a.pmid),
    );
    if (articlesToExport.length === 0) {
      setNotification({
        id: Date.now(),
        message: t('kb.export.noneSelected'),
        type: 'error',
      });
      return;
    }

    try {
      switch (showExportModal) {
        case 'pdf':
          exportKnowledgeBaseToPdf(
            articlesToExport,
            t('kb.export.pdfTitle'),
            (pmid) =>
              knowledgeBase
                .flatMap((e) =>
                  e.sourceType === 'research' ? e.report.aiGeneratedInsights || [] : [],
                )
                .filter((i) => (i.supportingArticles || []).includes(pmid)),
            exportSettings.pdf,
          );
          break;
        case 'csv':
          exportToCsv(articlesToExport, 'knowledge_base_selection', exportSettings.csv);
          break;
        case 'bib':
        case 'ris':
          exportCitations(articlesToExport, exportSettings.citation, showExportModal);
          break;
        default:
          break;
      }
    } catch (error) {
      setShowExportModal(null);
      setNotification({
        id: Date.now(),
        message: t('kb.export.failed', { error: exportErrorUserMessage(error) }),
        type: 'error',
      });
      return;
    }
    const format = showExportModal.toUpperCase();
    setShowExportModal(null);
    setNotification({
      id: Date.now(),
      message: t('kb.export.success', { count: articlesToExport.length, format }),
      type: 'success',
    });
  }, [
    showExportModal,
    selectedKbPmids,
    uniqueArticles,
    exportSettings,
    setNotification,
    knowledgeBase,
    t,
  ]);

  return {
    showExportModal,
    setShowExportModal,
    handleExportSelection,
    handleConfirmExport,
  };
}
