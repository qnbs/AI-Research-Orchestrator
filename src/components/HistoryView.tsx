import React, { useState } from 'react';
import type { KnowledgeBaseEntry } from '../types';
import { HistoryIcon } from './icons/HistoryIcon';
import { SearchIcon } from './icons/SearchIcon';
import { useKnowledgeBase } from '../contexts/KnowledgeBaseContext';
import { EmptyState } from './EmptyState';
import { DocumentPlusIcon } from './icons/DocumentPlusIcon';
import { useUI } from '../contexts/UIContext';
import { useTranslation } from '../hooks/useTranslation';
import { HistoryListItem } from './history/HistoryListItem';
import { HistoryQuickViewModal } from './history/HistoryQuickViewModal';

interface HistoryViewProps {
  onViewEntry: (entry: KnowledgeBaseEntry) => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ onViewEntry }) => {
  const { t } = useTranslation();
  const { knowledgeBase, updateEntryTitle } = useKnowledgeBase();
  const { setCurrentView } = useUI();
  const [quickViewEntry, setQuickViewEntry] = useState<KnowledgeBaseEntry | null>(null);
  const [editingEntry, setEditingEntry] = useState<{ id: string; title: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEntries = knowledgeBase
    .filter((entry) => entry.title.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => b.timestamp - a.timestamp);

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && editingEntry) {
      updateEntryTitle(editingEntry.id, editingEntry.title);
      setEditingEntry(null);
      return;
    }
    if (e.key === 'Escape') {
      setEditingEntry(null);
    }
  };

  const handleSaveTitle = () => {
    if (!editingEntry) return;
    updateEntryTitle(editingEntry.id, editingEntry.title);
    setEditingEntry(null);
  };

  if (knowledgeBase.length === 0) {
    return (
      <div className="h-[calc(100vh-200px)]">
        <EmptyState
          icon={<HistoryIcon className="h-24 w-24" />}
          title={t('history.empty.title')}
          message={t('history.empty.message')}
          action={{
            text: t('history.empty.action'),
            onClick: () => setCurrentView('orchestrator'),
            icon: <DocumentPlusIcon className="h-5 w-5" />,
          }}
        />
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold brand-gradient-text">{t('history.page.title')}</h1>
        <p className="mt-2 text-lg text-text-secondary">{t('history.page.subtitle')}</p>
      </div>

      <div className="max-w-3xl mx-auto mb-6">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
          <input
            type="text"
            placeholder={t(
              knowledgeBase.length === 1 ? 'history.search.entries_one' : 'history.search.entries',
              { count: knowledgeBase.length },
            )}
            aria-label={t('history.search.aria_label')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-surface border border-border rounded-md py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-brand-accent"
          />
        </div>
      </div>

      <div className="bg-surface border border-border rounded-lg shadow-lg max-w-4xl mx-auto">
        <ul className="divide-y divide-border">
          {filteredEntries.map((entry) => (
            <HistoryListItem
              key={entry.id}
              entry={entry}
              onViewEntry={onViewEntry}
              onQuickView={setQuickViewEntry}
              onStartEdit={setEditingEntry}
              isEditing={editingEntry?.id === entry.id}
              editingTitle={editingEntry?.id === entry.id ? editingEntry.title : ''}
              onTitleChange={(title) => editingEntry && setEditingEntry({ ...editingEntry, title })}
              onSaveTitle={handleSaveTitle}
              onCancelEdit={() => setEditingEntry(null)}
              onEditKeyDown={handleEditKeyDown}
            />
          ))}
        </ul>
      </div>

      {quickViewEntry && (
        <HistoryQuickViewModal
          entry={quickViewEntry}
          onClose={() => setQuickViewEntry(null)}
          onViewEntry={onViewEntry}
        />
      )}
    </div>
  );
};

export default HistoryView;
