
import React, { memo } from 'react';
import type { KnowledgeBaseFilter } from '../types';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { ArticleDetailPanel } from './ArticleDetailPanel';
import { ConfirmationModal } from './ConfirmationModal';
import type { View } from '../contexts/UIContext';
import { EmptyState } from './EmptyState';
import { DocumentPlusIcon } from './icons/DocumentPlusIcon';
import { useKnowledgeBaseLogic } from './knowledge-base/useKnowledgeBaseLogic';
import { KnowledgeBaseViewProvider, useKnowledgeBaseView } from './knowledge-base/KnowledgeBaseViewContext';
import { 
    SidebarFilters, 
    HeaderControls, 
    BulkActionsToolbar, 
    ArticleList, 
    Pagination, 
    PdfExportingOverlay 
} from './knowledge-base/KnowledgeBaseSubComponents';

interface KnowledgeBaseViewProps {
  onViewChange: (view: View) => void;
  filter: KnowledgeBaseFilter;
  onFilterChange: (newFilter: Partial<KnowledgeBaseFilter>) => void;
  selectedPmids: string[];
  setSelectedPmids: React.Dispatch<React.SetStateAction<string[]>>;
}

const KnowledgeBaseViewLayout: React.FC = () => {
    const { uniqueArticles, articleInDetail, setArticleInDetail, findRelatedInsights, showDeleteModal, setShowDeleteModal, handleDelete, selectedPmids, showExportModal, handleConfirmExport, setShowExportModal, isExporting, onViewChange } = useKnowledgeBaseView();

    if (uniqueArticles.length === 0) {
        return <div className="h-[calc(100vh-200px)]"><EmptyState icon={<DatabaseIcon className="h-24 w-24" />} title="Your Knowledge Base is Empty" message="Save reports from the Orchestrator tab to start building your personal research library." action={{ text: "Start Research", onClick: () => onViewChange('orchestrator'), icon: <DocumentPlusIcon className="h-5 w-5" /> }} /></div>
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

            {articleInDetail && <ArticleDetailPanel article={articleInDetail} onClose={() => setArticleInDetail(null)} findRelatedInsights={findRelatedInsights} />}
            {showDeleteModal && <ConfirmationModal onConfirm={handleDelete} onCancel={() => setShowDeleteModal(false)} title="Delete Articles?" message={<>Are you sure you want to permanently delete <strong>{selectedPmids.length}</strong> article(s) from your knowledge base?</>} confirmText="Yes, Delete"/>}
            {showExportModal && <ConfirmationModal onConfirm={handleConfirmExport} onCancel={() => setShowExportModal(null)} title={`Export ${selectedPmids.length} Articles`} message={`You are about to export citations for the ${selectedPmids.length} selected articles as a ${showExportModal.toUpperCase()} file.`} confirmText={isExporting ? 'Exporting...' : 'Yes, Export'} isConfirming={isExporting} confirmButtonClass="bg-brand-accent" />}
            {isExporting && showExportModal === 'pdf' && <PdfExportingOverlay />}
        </div>
    );
}

const KnowledgeBaseViewComponent: React.FC<KnowledgeBaseViewProps> = (props) => {
    const logic = useKnowledgeBaseLogic(
        props.onViewChange,
        props.filter,
        props.onFilterChange,
        props.selectedPmids,
        props.setSelectedPmids
    );

    return (
        <KnowledgeBaseViewProvider value={logic}>
            <KnowledgeBaseViewLayout />
        </KnowledgeBaseViewProvider>
    );
};

export default memo(KnowledgeBaseViewComponent);
