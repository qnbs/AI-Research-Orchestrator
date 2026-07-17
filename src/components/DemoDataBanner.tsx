import React, { useMemo } from 'react';
import { useKnowledgeBase } from '../contexts/KnowledgeBaseContext';
import { isDemoEntryId } from '../services/heuristics';
import { useTranslation } from '../hooks/useTranslation';

/**
 * Banner when seeded demo Knowledge Base entries are present.
 */
export const DemoDataBanner: React.FC = () => {
  const { knowledgeBase, clearDemoData } = useKnowledgeBase();
  const { t } = useTranslation();

  const hasDemo = useMemo(() => knowledgeBase.some((e) => isDemoEntryId(e.id)), [knowledgeBase]);

  if (!hasDemo) return null;

  return (
    <div
      role="status"
      className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-100 flex flex-wrap items-center justify-between gap-2"
    >
      <span>{t('inference.demo.banner')}</span>
      <button
        type="button"
        className="rounded-md border border-amber-500/40 px-2 py-1 text-xs font-medium hover:bg-amber-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        onClick={() => {
          void clearDemoData().catch(() => {
            /* errors surfaced via KnowledgeBase notification */
          });
        }}
      >
        {t('inference.demo.dismiss')}
      </button>
    </div>
  );
};
