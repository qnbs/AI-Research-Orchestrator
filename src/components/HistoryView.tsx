import React, { useState, useEffect, memo } from 'react';
import type { KnowledgeBaseEntry } from '../types';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { HistoryIcon } from './icons/HistoryIcon';
import { EyeIcon } from './icons/EyeIcon';
import { XIcon } from './icons/XIcon';
import { PencilIcon } from './icons/PencilIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { SearchIcon } from './icons/SearchIcon';
import { useKnowledgeBase } from '../contexts/KnowledgeBaseContext';
import { EmptyState } from './EmptyState';
import { DocumentPlusIcon } from './icons/DocumentPlusIcon';
import { useUI } from '../contexts/UIContext';
import { DocumentIcon } from './icons/DocumentIcon';
import { AuthorIcon } from './icons/AuthorIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { useTranslation } from '../hooks/useTranslation';
import type { TranslationKey } from '../i18n/translations';

interface HistoryViewProps {
  onViewEntry: (entry: KnowledgeBaseEntry) => void;
}

const SYNTHESIS_FOCUS_KEYS: Record<string, TranslationKey> = {
  overview: 'orchestrator.focus.overview',
  clinical: 'orchestrator.focus.clinical',
  future: 'orchestrator.focus.future',
  gaps: 'orchestrator.focus.gaps',
};

const QuickViewModal: React.FC<{
  entry: KnowledgeBaseEntry;
  onClose: () => void;
  onViewEntry: (entry: KnowledgeBaseEntry) => void;
}> = ({ entry, onClose, onViewEntry }) => {
  const { t } = useTranslation();
  const modalRef = useFocusTrap<HTMLDivElement>(true);
  const { sourceType, title, articles } = entry;

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

  const keywordsAndConcepts =
    entry.sourceType === 'research'
      ? (entry.report.overallKeywords || []).slice(0, 3).map((kw) => kw.keyword)
      : entry.sourceType === 'author'
        ? (entry.profile.coreConcepts || []).slice(0, 3).map((c) => c.concept)
        : (entry.journalProfile.focusAreas || []).slice(0, 3);

  const typeTitle =
    sourceType === 'author'
      ? t('history.quick.author_profile')
      : sourceType === 'journal'
        ? t('history.quick.journal_profile')
        : t('history.quick.research_report');

  const viewAction =
    sourceType === 'author'
      ? t('history.quick.view_full_profile')
      : sourceType === 'journal'
        ? t('history.quick.view_details')
        : t('history.quick.view_full_report');

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- standard modal backdrop click-to-dismiss; keyboard users dismiss via the Escape key handler above, not by activating the backdrop itself.
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm animate-fadeIn"
      style={{ animationDuration: '150ms' }}
      onClick={onClose}
    >
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events -- only stops the backdrop's dismiss-on-click from firing when clicking inside the panel; not itself an interactive widget. */}
      <div
        ref={modalRef}
        className="bg-surface rounded-lg border border-border shadow-2xl p-6 w-full max-w-lg m-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-view-title"
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 id="quick-view-title" className="text-lg font-bold text-brand-accent">
              {typeTitle}
            </h3>
            <p className="text-sm text-text-secondary mt-1 max-w-md">{title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-surface-hover focus-ring-aa"
            aria-label={t('common.close')}
          >
            <span className="sr-only">{t('common.close')}</span>
            <XIcon className="h-5 w-5 text-text-secondary" />
          </button>
        </div>

        <div className="space-y-4 my-6">
          <div>
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              {sourceType === 'author'
                ? t('history.quick.publications_found')
                : t('history.quick.articles_found')}
            </h4>
            <p className="text-text-primary font-medium">{articles.length}</p>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              {t('history.quick.top_keywords')}
            </h4>
            {keywordsAndConcepts.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-2">
                {keywordsAndConcepts.map((kw) => (
                  <span
                    key={kw}
                    className="bg-sky-500/10 text-sky-300 text-xs font-medium px-2 py-0.5 rounded-full border border-sky-500/20"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-text-secondary italic text-sm mt-1">
                {t('history.quick.no_keywords')}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-border text-sm font-medium rounded-md shadow-sm text-text-primary bg-surface hover:bg-surface-hover"
          >
            {t('common.close')}
          </button>
          <button
            onClick={() => {
              onViewEntry(entry);
              onClose();
            }}
            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-brand-text-on-accent bg-brand-accent hover:bg-opacity-90"
          >
            {viewAction}
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
  onStartEdit: (entry: { id: string; title: string }) => void;
  isEditing: boolean;
  editingTitle: string;
  onTitleChange: (title: string) => void;
  onSaveTitle: () => void;
  onCancelEdit: () => void;
  onEditKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const HistoryListItem = memo<HistoryListItemProps>(function HistoryListItem({
  entry,
  onViewEntry,
  onQuickView,
  onStartEdit,
  isEditing,
  editingTitle,
  onTitleChange,
  onSaveTitle,
  onCancelEdit,
  onEditKeyDown,
}) {
  const { t, lang } = useTranslation();
  const { sourceType, title, timestamp, articles } = entry;
  const Icon =
    sourceType === 'author' ? AuthorIcon : sourceType === 'journal' ? BookOpenIcon : DocumentIcon;
  const iconColor =
    sourceType === 'author'
      ? 'text-accent-magenta'
      : sourceType === 'journal'
        ? 'text-green-400'
        : 'text-brand-accent';

  const viewLabel =
    sourceType === 'author'
      ? t('history.list.view_profile')
      : sourceType === 'journal'
        ? t('history.list.view_details')
        : t('history.list.view_report');

  const articleCount = articles.length;
  const articlesLabel = t(
    articleCount === 1 ? 'history.list.articles_one' : 'history.list.articles',
    { count: articleCount },
  );
  const focusKey =
    entry.sourceType === 'research' ? SYNTHESIS_FOCUS_KEYS[entry.input.synthesisFocus] : undefined;
  const focusLabel = focusKey ? t(focusKey) : undefined;
  const dateRangeLabel =
    entry.sourceType === 'research'
      ? entry.input.dateRange === 'any'
        ? t('history.list.date_any')
        : t('history.list.date_last_years', { years: entry.input.dateRange })
      : undefined;

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
                  // eslint-disable-next-line jsx-a11y/no-autofocus -- this input only renders after the user explicitly clicks "rename"; focusing it is the expected result of that action, not page-load autofocus.
                  autoFocus
                />
                <button
                  onClick={onSaveTitle}
                  className="p-1.5 rounded-full text-green-400 hover:bg-green-500/10"
                >
                  <CheckCircleIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={onCancelEdit}
                  className="p-1.5 rounded-full text-red-400 hover:bg-red-500/10"
                >
                  <XCircleIcon className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <h3 className="text-lg font-semibold text-text-primary truncate" title={title}>
                {title}
              </h3>
            )}
            <p className="text-xs text-text-secondary mt-1">
              {t('history.created_on', {
                date: new Date(timestamp).toLocaleString(lang),
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 self-start sm:self-center">
          <button
            onClick={() => onStartEdit({ id: entry.id, title: title })}
            className="p-2 rounded-md text-text-secondary hover:bg-surface-hover hover:text-brand-accent transition-colors focus-ring-aa"
            aria-label={t('history.aria.edit_title')}
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => onQuickView(entry)}
            className="p-2 rounded-md text-text-secondary hover:bg-surface-hover hover:text-brand-accent transition-colors focus-ring-aa"
            aria-label={t('history.aria.quick_view')}
          >
            <EyeIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => onViewEntry(entry)}
            className="inline-flex items-center px-3 py-1.5 border border-border text-xs font-medium rounded-md shadow-sm text-text-primary bg-surface hover:bg-surface-hover hover:border-brand-accent transition-colors focus-ring-aa"
          >
            {viewLabel}
          </button>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-border/50 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-text-secondary">
        {entry.sourceType === 'research' && (
          <>
            <div>{articlesLabel}</div>
            <div>
              <strong>{t('history.list.focus')}</strong> {focusLabel}
            </div>
            <div>
              <strong>{t('history.list.date_range')}</strong> {dateRangeLabel}
            </div>
          </>
        )}
        {entry.sourceType === 'author' && (
          <div>
            {t(articleCount === 1 ? 'history.list.publications_one' : 'history.list.publications', {
              count: articleCount,
            })}
          </div>
        )}
        {entry.sourceType === 'journal' && (
          <>
            <div>{articlesLabel}</div>
            <div>
              <strong>{t('history.list.issn')}</strong> {entry.journalProfile.issn}
            </div>
            <div>
              <strong>{t('history.list.oa_policy')}</strong> {entry.journalProfile.oaPolicy}
            </div>
          </>
        )}
      </div>
    </li>
  );
});

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
            placeholder={t('history.search.entries', { count: knowledgeBase.length })}
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
        <QuickViewModal
          entry={quickViewEntry}
          onClose={() => setQuickViewEntry(null)}
          onViewEntry={onViewEntry}
        />
      )}
    </div>
  );
};
export default HistoryView;
