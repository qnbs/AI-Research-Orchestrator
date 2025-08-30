import React, { useState, useEffect } from 'react';
import type { KnowledgeBaseEntry } from '../types';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { HistoryIcon } from './icons/HistoryIcon';
import { EyeIcon } from './icons/EyeIcon';
import { XIcon } from './icons/XIcon';
import { PencilIcon } from './icons/PencilIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { SearchIcon } from './icons/SearchIcon';
import { useSettings } from '../contexts/SettingsContext';
import { useKnowledgeBase } from '../contexts/KnowledgeBaseContext';

interface HistoryViewProps {
  onViewReport: (entry: KnowledgeBaseEntry) => void;
}

const synthesisFocusText: { [key: string]: string } = {
  'overview': 'Broad Overview',
  'clinical': 'Clinical Implications',
  'future': 'Future Research',
  'gaps': 'Contradictions & Gaps'
};

const QuickViewModal: React.FC<{ entry: KnowledgeBaseEntry; onClose: () => void; onViewReport: (entry: KnowledgeBaseEntry) => void }> = ({ entry, onClose, onViewReport }) => {
    const modalRef = useFocusTrap<HTMLDivElement>(true);

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

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm animate-fadeIn" style={{ animationDuration: '150ms' }} onClick={onClose}>
            <div ref={modalRef} className="bg-surface rounded-lg border border-border shadow-2xl p-6 w-full max-w-lg m-4" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="quick-view-title">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 id="quick-view-title" className="text-lg font-bold text-brand-accent">Quick View</h3>
                        <p className="text-sm text-text-secondary mt-1 max-w-md">{entry.input.researchTopic}</p>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-background">
                        <span className="sr-only">Close</span>
                        <XIcon className="h-5 w-5 text-text-secondary"/>
                    </button>
                </div>
                
                <div className="space-y-4 my-6">
                    <div>
                        <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Articles Found</h4>
                        <p className="text-text-primary font-medium">{entry.report.rankedArticles.length}</p>
                    </div>
                    <div>
                        <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Top 3 Keywords</h4>
                        {entry.report.overallKeywords && entry.report.overallKeywords.length > 0 ? (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {entry.report.overallKeywords.slice(0, 3).map(kw => (
                                    <span key={kw.keyword} className="bg-sky-500/10 text-sky-300 text-xs font-medium px-2 py-0.5 rounded-full border border-sky-500/20">{kw.keyword}</span>
                                ))}
                            </div>
                        ) : (
                             <p className="text-text-secondary italic text-sm mt-1">No keywords identified.</p>
                        )}
                    </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 border border-border text-sm font-medium rounded-md shadow-sm text-text-primary bg-background hover:bg-surface-hover">
                        Close
                    </button>
                    <button onClick={() => {
                        onViewReport(entry);
                        onClose();
                    }} className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-brand-text-on-accent bg-brand-accent hover:bg-opacity-90">
                        View Full Report
                    </button>
                </div>
            </div>
        </div>
    );
};

export const HistoryView: React.FC<HistoryViewProps> = ({ onViewReport }) => {
  const { settings } = useSettings();
  const { knowledgeBase, updateReportTitle } = useKnowledgeBase();
  const [quickViewEntry, setQuickViewEntry] = useState<KnowledgeBaseEntry | null>(null);
  const [editingEntry, setEditingEntry] = useState<{ id: string; title: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleEdit = (entry: KnowledgeBaseEntry) => {
    setEditingEntry({ id: entry.id, title: entry.input.researchTopic });
  };

  const handleSaveEdit = () => {
      if (editingEntry && editingEntry.title.trim()) {
          updateReportTitle(editingEntry.id, editingEntry.title.trim());
          setEditingEntry(null);
      }
  };

  const handleCancelEdit = () => {
      setEditingEntry(null);
  };
  
  const filteredEntries = knowledgeBase
    .filter(entry =>
        entry.input.researchTopic.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => parseInt(b.id.split('-')[0]) - parseInt(a.id.split('-')[0]));
  
  const densityClasses = settings.appearance.density === 'compact'
    ? { container: 'p-2', title: 'text-sm', text: 'text-xs' }
    : { container: 'p-4', title: 'text-base', text: 'text-xs' };

  return (
    <div className="animate-fadeIn">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-brand-accent">Research History</h1>
        <p className="mt-2 text-lg text-text-secondary">Browse and revisit all your previously generated and saved reports.</p>
      </div>

      {knowledgeBase.length === 0 ? (
        <div className="text-center py-16">
            <HistoryIcon className="h-24 w-24 text-border mx-auto mb-6" />
            <p className="text-lg font-semibold text-text-primary">No reports in your history yet.</p>
            <p className="text-text-secondary mt-1">Save a report from the Orchestrator tab to start building your history.</p>
        </div>
      ) : (
        <>
        <div className="relative mb-6 max-w-lg mx-auto">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
            <input
                type="text"
                placeholder={`Search ${knowledgeBase.length} reports...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-surface border border-border rounded-md py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-brand-accent"
            />
        </div>
        <div className="bg-surface border border-border rounded-lg shadow-lg overflow-hidden">
            <div className="divide-y divide-border">
                {filteredEntries.map(entry => (
                    <div key={entry.id} className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-surface-hover transition-colors ${densityClasses.container}`}>
                        <div className="flex-1 min-w-0">
                            {editingEntry?.id === entry.id ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={editingEntry.title}
                                        onChange={(e) => setEditingEntry({ ...editingEntry, title: e.target.value })}
                                        className="block w-full bg-background border border-border rounded-md shadow-sm py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent sm:text-sm"
                                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                                        autoFocus
                                    />
                                    <button onClick={handleSaveEdit} className="p-1.5 text-green-400 hover:bg-background rounded-full" aria-label="Save title"><CheckCircleIcon className="h-5 w-5"/></button>
                                    <button onClick={handleCancelEdit} className="p-1.5 text-red-400 hover:bg-background rounded-full" aria-label="Cancel edit"><XCircleIcon className="h-5 w-5"/></button>
                                </div>
                            ) : (
                                <h3 className={`font-semibold text-text-primary truncate ${densityClasses.title}`} title={entry.input.researchTopic}>{entry.input.researchTopic}</h3>
                            )}
                            <p className={`mt-1 ${densityClasses.text} text-text-secondary`}>
                                Generated: {new Date(parseInt(entry.id.split('-')[0])).toLocaleString()} | {entry.report.rankedArticles.length} articles | Focus: {synthesisFocusText[entry.input.synthesisFocus] || 'N/A'}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 self-start sm:self-center">
                            <button onClick={() => handleEdit(entry)} className="p-2 rounded-md text-text-secondary hover:bg-background hover:text-text-primary transition-colors" aria-label="Edit title"><PencilIcon className="h-4 w-4"/></button>
                            <button onClick={() => setQuickViewEntry(entry)} className="p-2 rounded-md text-text-secondary hover:bg-background hover:text-text-primary transition-colors" aria-label="Quick view"><EyeIcon className="h-5 w-5"/></button>
                            <button onClick={() => onViewReport(entry)} className="px-3 py-1.5 border border-border text-xs font-medium rounded-md shadow-sm text-text-primary bg-surface hover:bg-surface-hover hover:shadow-md hover:shadow-brand-accent/20 transition-all duration-200">View Full Report</button>
                        </div>
                    </div>
                ))}
                 {filteredEntries.length === 0 && (
                     <div className="text-center p-8 text-text-secondary">
                        No reports match your search.
                     </div>
                 )}
            </div>
        </div>
        </>
      )}

      {quickViewEntry && (
          <QuickViewModal entry={quickViewEntry} onClose={() => setQuickViewEntry(null)} onViewReport={onViewReport} />
      )}
    </div>
  );
};
