

import React, { useState, useEffect, memo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { KnowledgeBaseEntry, ResearchEntry } from '@/types';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { HistoryIcon } from '@/components/icons/HistoryIcon';
import { EyeIcon } from '@/components/icons/EyeIcon';
import { XIcon } from '@/components/icons/XIcon';
import { PencilIcon } from '@/components/icons/PencilIcon';
import { CheckCircleIcon } from '@/components/icons/CheckCircleIcon';
import { XCircleIcon } from '@/components/icons/XCircleIcon';
import { SearchIcon } from '@/components/icons/SearchIcon';
import { useKnowledgeBase } from '@/contexts/KnowledgeBaseContext';
import { EmptyState } from '@/components/EmptyState';
import { DocumentPlusIcon } from '@/components/icons/DocumentPlusIcon';
import { useUI } from '@/contexts/UIContext';
import { DocumentIcon } from '@/components/icons/DocumentIcon';
import { AuthorIcon } from '@/components/icons/AuthorIcon';
import { BookOpenIcon } from '@/components/icons/BookOpenIcon';

interface HistoryViewProps {
  onViewEntry: (entry: KnowledgeBaseEntry) => void;
}

const synthesisFocusText: { [key: string]: string } = {
  'overview': 'Broad Overview',
  'clinical': 'Clinical Implications',
  'future': 'Future Research',
  'gaps': 'Contradictions & Gaps'
};

const QuickViewModal: React.FC<{ entry: KnowledgeBaseEntry; onClose: () => void; onViewEntry: (entry: KnowledgeBaseEntry) => void }> = ({ entry, onClose, onViewEntry }) => {
    const modalRef = useFocusTrap<HTMLDivElement>(true);
    const title = entry.title;
    
    // FIX: Use an if/else if chain to correctly handle multiple source types.
    let typeLabel = 'Report';
    if (entry.sourceType === 'author') {
        typeLabel = 'Author Profile';
    } else if (entry.sourceType === 'journal') {
        typeLabel = 'Journal Profile';
    }

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
           if (event.key === 'Escape') {
               onClose();
           }
        };
        window.addEventListener('keydown', handleEsc);
        document.body.style.overflow = 'hidden';

        return () => {
            window.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    // FIX: Add exhaustive check for all sourceTypes to avoid 'never' type errors.
    const keywordsAndConcepts =
        entry.sourceType === 'research'
            ? (entry.report.overallKeywords || []).slice(0, 3).map(kw => kw.keyword)
            : entry.sourceType === 'author'
            ? (entry.profile.coreConcepts || []).slice(0, 3).map(c => c.concept)
            : entry.sourceType === 'journal'
            ? (entry.journalProfile.focusAreas || []).slice(0, 3)
            : [];

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm animate-fadeIn" style={{ animationDuration: '150ms' }} onClick={onClose}>
            <div ref={modalRef} className="bg-surface rounded-lg border border-border shadow-2xl p-6 w-full max-w-lg m-4" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="quick-view-title">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 id="quick-view-title" className="text-lg font-bold text-brand-accent">{typeLabel}</h3>
                        <p className="text-sm text-text-secondary mt-1 max-w-md">{title}</p>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-surface-hover">
                        <span className="sr-only">Close</span>
                        <XIcon className="h-5 w-5 text-text-secondary"/>
                    </button>
                </div>
                
                <div className="space-y-4 my-6">
                    <div>
                        <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{entry.sourceType !== 'author' ? 'Articles Found' : 'Publications Found'}</h4>
                        <p className="text-text-primary font-medium">{entry.articles.length}</p>
                    </div>
                    <div>
                        <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Top 3 Keywords/Concepts</h4>
                        {keywordsAndConcepts.length > 0 ? (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {keywordsAndConcepts.map(kw => (
                                    <span key={kw} className="bg-sky-500/10 text-sky-300 text-xs font-medium px-2 py-0.5 rounded-full border border-sky-500/20">{kw}</span>
                                ))}
                            </div>
                        ) : (
                             <p className="text-text-secondary italic text-sm mt-1">No keywords identified.</p>
                        )}
                    </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 border border-border text-sm font-medium rounded-md shadow-sm text-text-primary bg-surface hover:bg-surface-hover">
                        Close
                    </button>
                    <button onClick={() => {
                        onViewEntry(entry);
                        onClose();
                    }} className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-brand-text-on-accent bg-brand-accent hover:bg-opacity-90">
                        View Full Details
                    </button>
                </div>
            </div>
        </div>
    );
};


interface HistoryListItemProps {
    entry: KnowledgeBaseEntry;
    onViewEntry: (entry: KnowledgeBaseEntry) => void;
    onQuickView: (entry: KnowledgeBaseEntry) => void;
    onStartEdit: (entry: {id: string, title: string}) => void;
    isEditing: boolean;
    editingTitle: string;
    onTitleChange: (title: string) => void;
    onSaveTitle: () => void;
    onCancelEdit: () => void;
    onEditKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const HistoryListItem = memo<HistoryListItemProps>(({ entry, onViewEntry, onQuickView, onStartEdit, isEditing, editingTitle, onTitleChange, onSaveTitle, onCancelEdit, onEditKeyDown }) => {
    
    const Icon = entry.sourceType === 'research' ? DocumentIcon : entry.sourceType === 'author' ? AuthorIcon : BookOpenIcon;
    const iconColor = entry.sourceType === 'research' ? 'text-brand-accent' : entry.sourceType === 'author' ? 'text-accent-magenta' : 'text-accent-cyan';
    const viewButtonText = entry.sourceType === 'research' ? 'View Report' : entry.sourceType === 'author' ? 'View Profile' : 'View Details';

    return (
        <li className="p-4 sm:p-6 hover:bg-surface-hover transition-colors duration-150 group focus-within:ring-2 focus-within:ring-brand-accent focus-within:ring-offset-2 focus-within:ring-offset-surface rounded-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4 flex-grow min-w-0">
                    <Icon className={`h-8 w-8 mt-1 flex-shrink-0 ${iconColor}`} />
                    <div className="flex-grow min-w-0">
                        {isEditing ? (
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={editingTitle}
                                    onChange={(e) => onTitleChange(e.target.value)}
                                    onKeyDown={onEditKeyDown}
                                    className="w-full bg-input-bg border border-brand-accent rounded-md py-1 px-2 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-brand-accent"
                                    autoFocus
                                />
                                <button onClick={onSaveTitle} className="p-1.5 rounded-full text-green-400 hover:bg-green-500/10"><CheckCircleIcon className="h-5 w-5"/></button>
                                <button onClick={onCancelEdit} className="p-1.5 rounded-full text-red-400 hover:bg-red-500/10"><XCircleIcon className="h-5 w-5"/></button>
                            </div>
                        ) : (
                            <h3 className="text-lg font-semibold text-text-primary truncate" title={entry.title}>
                                {entry.title}
                            </h3>
                        )}
                        <p className="text-xs text-text-secondary mt-1">
                            Created on {new Date(entry.timestamp).toLocaleString()}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 self-start sm:self-center">
                    <button onClick={() => onStartEdit({ id: entry.id, title: entry.title })} className="p-2 rounded-md text-text-secondary hover:bg-surface-hover hover:text-brand-accent transition-colors" aria-label="Edit title">
                        <PencilIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => onQuickView(entry)} className="p-2 rounded-md text-text-secondary hover:bg-surface-hover hover:text-brand-accent transition-colors" aria-label="Quick view">
                        <EyeIcon className="h-5 w-5" />
                    </button>
                    <button onClick={() => onViewEntry(entry)} className="inline-flex items-center px-3 py-1.5 border border-border text-xs font-medium rounded-md shadow-sm text-text-primary bg-surface hover:bg-surface-hover hover:border-brand-accent transition-colors">
                        {viewButtonText}
                    </button>
                </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border/50 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-text-secondary">
                {/* FIX: Add exhaustive check for all sourceTypes to avoid 'never' type errors. */}
                {entry.sourceType === 'research' ? (
                    <>
                        <div><strong>{entry.articles.length}</strong> articles</div>
                        <div><strong>Focus:</strong> {synthesisFocusText[entry.input.synthesisFocus]}</div>
                        <div><strong>Date Range:</strong> {entry.input.dateRange === 'any' ? 'Any time' : `Last ${entry.input.dateRange} years`}</div>
                    </>
                ) : entry.sourceType === 'author' ? (
                     <div><strong>{entry.articles.length}</strong> publications</div>
                ) : entry.sourceType === 'journal' ? (
                    <>
                         <div><strong>{entry.articles.length}</strong> articles found</div>
                         {entry.journalProfile && <div><strong>Policy:</strong> {entry.journalProfile.oaPolicy}</div>}
                    </>
                ) : null}
            </div>
        </li>
    );
});

export const HistoryView: React.FC<HistoryViewProps> = ({ onViewEntry }) => {
  const { knowledgeBase, updateEntryTitle } = useKnowledgeBase();
  const { setCurrentView } = useUI();
  const [quickViewEntry, setQuickViewEntry] = useState<KnowledgeBaseEntry | null>(null);
  const [editingEntry, setEditingEntry] = useState<{ id: string; title: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const parentRef = useRef<HTMLDivElement>(null);

  const filteredEntries = knowledgeBase
    .filter(entry => entry.title.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => b.timestamp - a.timestamp);

  const rowVirtualizer = useVirtualizer({
      count: filteredEntries.length,
      getScrollElement: () => parentRef.current,
      estimateSize: () => 170, // Estimated height for each list item
      overscan: 5,
  });
    
  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (editingEntry) {
        updateEntryTitle(editingEntry.id, editingEntry.title);
        setEditingEntry(null);
      }
    } else if (e.key === 'Escape') {
      setEditingEntry(null);
    }
  };
  
  const handleSaveTitle = () => {
      if (editingEntry) {
        updateEntryTitle(editingEntry.id, editingEntry.title);
        setEditingEntry(null);
      }
  };

  if (knowledgeBase.length === 0) {
      return (
            <div className="h-[calc(100vh-200px)]">
                <EmptyState
                    icon={<HistoryIcon className="h-24 w-24" />}
                    title="No History Yet"
                    message="Your saved reports will appear here. Start a new search on the Orchestrator tab to begin building your research history."
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
    <div className="animate-fadeIn">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold brand-gradient-text">History</h1>
        <p className="mt-2 text-lg text-text-secondary">Review, manage, and revisit your past research reports and author profiles.</p>
      </div>

      <div className="max-w-3xl mx-auto mb-6">
          <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
              <input 
                  type="text"
                  placeholder={`Search ${knowledgeBase.length} entries...`}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-surface border border-border rounded-md py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-brand-accent"
              />
          </div>
      </div>

      <div ref={parentRef} className="bg-surface border border-border rounded-lg shadow-lg max-w-4xl mx-auto h-[60vh] overflow-y-auto">
        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
          {rowVirtualizer.getVirtualItems().map(virtualItem => {
              const entry = filteredEntries[virtualItem.index];
              return (
                  <div 
                    key={virtualItem.key}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualItem.size}px`,
                        transform: `translateY(${virtualItem.start}px)`,
                    }}
                    className="border-b border-border"
                  >
                    <HistoryListItem
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
                  </div>
              )
          })}
        </div>
      </div>

      {quickViewEntry && <QuickViewModal entry={quickViewEntry} onClose={() => setQuickViewEntry(null)} onViewEntry={onViewEntry} />}
    </div>
  );
};