import React, { memo } from 'react';
import type { KnowledgeBaseFilter } from '../types';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { ArticleDetailPanel } from './ArticleDetailPanel';
import { ConfirmationModal } from './ConfirmationModal';
import type { View } from '../contexts/UIContext';
import { EmptyState } from './EmptyState';
import { DocumentPlusIcon } from './icons/DocumentPlusIcon';
import { useKnowledgeBaseLogic } from './knowledge-base/useKnowledgeBaseLogic';
import {
  KnowledgeBaseViewProvider,
  useKnowledgeBaseView,
} from './knowledge-base/KnowledgeBaseViewContext';
import {
  SidebarFilters,
  HeaderControls,
  BulkActionsToolbar,
  ArticleList,
  Pagination,
  PdfExportingOverlay,
} from './knowledge-base/KnowledgeBaseSubComponents';
import { useTranslation } from '../hooks/useTranslation';

interface KnowledgeBaseViewProps {
  onViewChange: (view: View) => void;
  filter: KnowledgeBaseFilter;
  onFilterChange: (newFilter: Partial<KnowledgeBaseFilter>) => void;
  selectedPmids: string[];
  setSelectedPmids: React.Dispatch<React.SetStateAction<string[]>>;
  onAnalyzeJournal?: (journalName: string) => void;
}

const KnowledgeBaseViewLayout: React.FC = () => {
  const { t } = useTranslation();
  const {
    uniqueArticles,
    articleInDetail,
    setArticleInDetail,
    findRelatedInsights,
    showDeleteModal,
    setShowDeleteModal,
    handleDelete,
    selectedPmids,
    showExportModal,
    handleConfirmExport,
    setShowExportModal,
    isExporting,
    onViewChange,
    onAnalyzeJournal,
  } = useKnowledgeBaseView();

  if (uniqueArticles.length === 0) {
    return (
      <div className="h-[calc(100vh-200px)]">
        <EmptyState
          icon={<DatabaseIcon className="h-24 w-24" />}
          title={t('kb.empty.title')}
          message={t('kb.empty.message')}
          action={{
            text: t('kb.empty.action'),
            onClick: () => onViewChange('orchestrator'),
            icon: <DocumentPlusIcon className="h-5 w-5" />,
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex gap-6 animate-fadeIn">
      <SidebarFilters />
      <main className="flex-1 min-w-0">
        <HeaderControls />
        <BulkActionsToolbar />
        <ArticleList />
        <Pagination />
      </main>

      {articleInDetail && (
        <ArticleDetailPanel
          article={articleInDetail}
          onClose={() => setArticleInDetail(null)}
          findRelatedInsights={findRelatedInsights}
          onAnalyzeJournal={onAnalyzeJournal}
        />
      )}
      {showDeleteModal && (
        <ConfirmationModal
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
          title={t('kb.delete.title')}
          message={t('kb.delete.message', { count: selectedPmids.length })}
          confirmText={t('kb.delete.confirm')}
        />
      )}
      {showExportModal && (
        <ConfirmationModal
          onConfirm={handleConfirmExport}
          onCancel={() => setShowExportModal(null)}
          title={t('kb.export.confirmTitle', { count: selectedPmids.length })}
          message={t('kb.export.confirmMessage', {
            count: selectedPmids.length,
            format: showExportModal.toUpperCase(),
          })}
          confirmText={isExporting ? t('kb.export.exporting') : t('kb.export.confirm')}
          isConfirming={isExporting}
          confirmButtonClass="bg-brand-accent"
        />
      )}
      {isExporting && showExportModal === 'pdf' && <PdfExportingOverlay />}
    </div>
  );
};

const KnowledgeBaseViewComponent: React.FC<KnowledgeBaseViewProps> = (props) => {
  const logic = useKnowledgeBaseLogic(
    props.onViewChange,
    props.filter,
    props.onFilterChange,
    props.selectedPmids,
    props.setSelectedPmids,
    props.onAnalyzeJournal,
  );

  return (
    <KnowledgeBaseViewProvider value={logic}>
      <KnowledgeBaseViewLayout />
    </KnowledgeBaseViewProvider>
  );
};

export default memo(KnowledgeBaseViewComponent);
