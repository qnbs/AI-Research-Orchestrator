import React, { memo, useEffect, useRef } from 'react';
import type { KnowledgeBaseEntry } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { EyeIcon } from '../icons/EyeIcon';
import { PencilIcon } from '../icons/PencilIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { XCircleIcon } from '../icons/XCircleIcon';
import {
  SYNTHESIS_FOCUS_KEYS,
  historyEntryIcon,
  sourceTypeListViewKey,
} from './historyViewHelpers';

type Translate = ReturnType<typeof useTranslation>['t'];

const HistoryTitleEditor: React.FC<{
  editingTitle: string;
  onTitleChange: (title: string) => void;
  onEditKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSaveTitle: () => void;
  onCancelEdit: () => void;
}> = ({ editingTitle, onTitleChange, onEditKeyDown, onSaveTitle, onCancelEdit }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="text"
        value={editingTitle}
        onChange={(e) => onTitleChange(e.target.value)}
        onKeyDown={onEditKeyDown}
        className="w-full bg-input-bg border border-brand-accent rounded-md py-1 px-2 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-brand-accent"
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
  );
};

const AuthorEntryMeta: React.FC<{ count: number; t: Translate }> = ({ count, t }) => (
  <div>
    {t(count === 1 ? 'history.list.publications_one' : 'history.list.publications', { count })}
  </div>
);

const JournalEntryMeta: React.FC<{
  articlesLabel: string;
  issn: string;
  oaPolicy: string;
  t: Translate;
}> = ({ articlesLabel, issn, oaPolicy, t }) => (
  <>
    <div>{articlesLabel}</div>
    <div>
      <strong>{t('history.list.issn')}</strong> {issn}
    </div>
    <div>
      <strong>{t('history.list.oa_policy')}</strong> {oaPolicy}
    </div>
  </>
);

const ResearchEntryMeta: React.FC<{
  articlesLabel: string;
  focusLabel: string;
  dateRangeLabel: string;
  t: Translate;
}> = ({ articlesLabel, focusLabel, dateRangeLabel, t }) => (
  <>
    <div>{articlesLabel}</div>
    <div>
      <strong>{t('history.list.focus')}</strong> {focusLabel}
    </div>
    <div>
      <strong>{t('history.list.date_range')}</strong> {dateRangeLabel}
    </div>
  </>
);

const HistoryEntryMeta: React.FC<{ entry: KnowledgeBaseEntry }> = ({ entry }) => {
  const { t } = useTranslation();
  const articleCount = entry.articles.length;
  const articlesLabel = t(
    articleCount === 1 ? 'history.list.articles_one' : 'history.list.articles',
    { count: articleCount },
  );

  if (entry.sourceType === 'author') {
    return <AuthorEntryMeta count={articleCount} t={t} />;
  }
  if (entry.sourceType === 'journal') {
    return (
      <JournalEntryMeta
        articlesLabel={articlesLabel}
        issn={entry.journalProfile.issn}
        oaPolicy={entry.journalProfile.oaPolicy}
        t={t}
      />
    );
  }

  const focusKey = SYNTHESIS_FOCUS_KEYS[entry.input.synthesisFocus];
  const dateRangeLabel =
    entry.input.dateRange === 'any'
      ? t('history.list.date_any')
      : t('history.list.date_last_years', { years: entry.input.dateRange });

  return (
    <ResearchEntryMeta
      articlesLabel={articlesLabel}
      focusLabel={t(focusKey)}
      dateRangeLabel={dateRangeLabel}
      t={t}
    />
  );
};

const HistoryListItemIdentity: React.FC<{
  entry: KnowledgeBaseEntry;
  isEditing: boolean;
  editingTitle: string;
  onTitleChange: (title: string) => void;
  onSaveTitle: () => void;
  onCancelEdit: () => void;
  onEditKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}> = ({
  entry,
  isEditing,
  editingTitle,
  onTitleChange,
  onSaveTitle,
  onCancelEdit,
  onEditKeyDown,
}) => {
  const { t, lang } = useTranslation();
  const { Icon, color: iconColor } = historyEntryIcon(entry.sourceType);
  const titleNode = isEditing ? (
    <HistoryTitleEditor
      editingTitle={editingTitle}
      onTitleChange={onTitleChange}
      onEditKeyDown={onEditKeyDown}
      onSaveTitle={onSaveTitle}
      onCancelEdit={onCancelEdit}
    />
  ) : (
    <h3 className="text-lg font-semibold text-text-primary truncate" title={entry.title}>
      {entry.title}
    </h3>
  );

  return (
    <div className="flex items-start gap-4 flex-grow min-w-0">
      <Icon className={`h-8 w-8 mt-1 flex-shrink-0 ${iconColor}`} />
      <div className="flex-grow min-w-0">
        {titleNode}
        <p className="text-xs text-text-secondary mt-1">
          {t('history.created_on', {
            date: new Date(entry.timestamp).toLocaleString(lang),
          })}
        </p>
      </div>
    </div>
  );
};

const HistoryListItemActions: React.FC<{
  entry: KnowledgeBaseEntry;
  onViewEntry: (entry: KnowledgeBaseEntry) => void;
  onQuickView: (entry: KnowledgeBaseEntry) => void;
  onStartEdit: (entry: { id: string; title: string }) => void;
}> = ({ entry, onViewEntry, onQuickView, onStartEdit }) => {
  const { t } = useTranslation();
  const viewLabel = t(sourceTypeListViewKey(entry.sourceType));
  const startEdit = () => onStartEdit({ id: entry.id, title: entry.title });

  return (
    <div className="flex items-center gap-2 flex-shrink-0 self-start sm:self-center">
      <button
        onClick={startEdit}
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
  );
};

export interface HistoryListItemProps {
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

export const HistoryListItem = memo<HistoryListItemProps>(function HistoryListItem({
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
  return (
    <li className="p-4 sm:p-6 hover:bg-surface-hover transition-colors duration-150 group focus-within:ring-2 focus-within:ring-brand-accent focus-within:ring-offset-2 focus-within:ring-offset-surface rounded-md">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <HistoryListItemIdentity
          entry={entry}
          isEditing={isEditing}
          editingTitle={editingTitle}
          onTitleChange={onTitleChange}
          onSaveTitle={onSaveTitle}
          onCancelEdit={onCancelEdit}
          onEditKeyDown={onEditKeyDown}
        />
        <HistoryListItemActions
          entry={entry}
          onViewEntry={onViewEntry}
          onQuickView={onQuickView}
          onStartEdit={onStartEdit}
        />
      </div>
      <div className="mt-4 pt-4 border-t border-border/50 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-text-secondary">
        <HistoryEntryMeta entry={entry} />
      </div>
    </li>
  );
});
