import React from 'react';
import type { KnowledgeBaseEntry } from '../../types';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useTranslation } from '../../hooks/useTranslation';
import { XIcon } from '../icons/XIcon';
import {
  articlesFoundLabelKey,
  keywordsForEntry,
  sourceTypeQuickViewKey,
  sourceTypeTitleKey,
} from './historyViewHelpers';

const QuickViewKeywords: React.FC<{ keywords: string[] }> = ({ keywords }) => {
  const { t } = useTranslation();
  if (keywords.length === 0) {
    return (
      <p className="text-text-secondary italic text-sm mt-1">{t('history.quick.no_keywords')}</p>
    );
  }
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {keywords.map((kw) => (
        <span
          key={kw}
          className="bg-sky-500/10 text-sky-300 text-xs font-medium px-2 py-0.5 rounded-full border border-sky-500/20"
        >
          {kw}
        </span>
      ))}
    </div>
  );
};

export const HistoryQuickViewModal: React.FC<{
  entry: KnowledgeBaseEntry;
  onClose: () => void;
  onViewEntry: (entry: KnowledgeBaseEntry) => void;
}> = ({ entry, onClose, onViewEntry }) => {
  const { t } = useTranslation();
  const modalRef = useFocusTrap<HTMLDivElement>(true, {
    onEscape: onClose,
    lockScroll: true,
  });
  const { sourceType, title, articles } = entry;
  const keywordsAndConcepts = keywordsForEntry(entry);
  const typeTitle = t(sourceTypeTitleKey(sourceType));
  const viewAction = t(sourceTypeQuickViewKey(sourceType));
  const foundLabel = t(articlesFoundLabelKey(sourceType));

  const openFullEntry = () => {
    onViewEntry(entry);
    onClose();
  };

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- standard modal backdrop click-to-dismiss; keyboard users dismiss via Escape, not by activating the backdrop.
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm animate-fadeIn"
      style={{ animationDuration: '150ms' }}
      onClick={onClose}
    >
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events -- stops backdrop dismiss when clicking the panel. */}
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
              {foundLabel}
            </h4>
            <p className="text-text-primary font-medium">{articles.length}</p>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              {t('history.quick.top_keywords')}
            </h4>
            <QuickViewKeywords keywords={keywordsAndConcepts} />
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
            onClick={openFullEntry}
            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-brand-text-on-accent bg-brand-accent hover:bg-opacity-90"
          >
            {viewAction}
          </button>
        </div>
      </div>
    </div>
  );
};
