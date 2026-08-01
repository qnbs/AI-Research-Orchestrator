import { AuthorIcon } from '../icons/AuthorIcon';
import { BookOpenIcon } from '../icons/BookOpenIcon';
import { DocumentIcon } from '../icons/DocumentIcon';
import type { TranslationKey } from '../../i18n/translations';
import type { KnowledgeBaseEntry } from '../../types';

export const SYNTHESIS_FOCUS_KEYS: Record<string, TranslationKey> = {
  overview: 'orchestrator.focus.overview',
  clinical: 'orchestrator.focus.clinical',
  future: 'orchestrator.focus.future',
  gaps: 'orchestrator.focus.gaps',
};

const TITLE_KEYS: Record<KnowledgeBaseEntry['sourceType'], TranslationKey> = {
  author: 'history.quick.author_profile',
  journal: 'history.quick.journal_profile',
  research: 'history.quick.research_report',
};

const QUICK_VIEW_KEYS: Record<KnowledgeBaseEntry['sourceType'], TranslationKey> = {
  author: 'history.quick.view_full_profile',
  journal: 'history.quick.view_details',
  research: 'history.quick.view_full_report',
};

const LIST_VIEW_KEYS: Record<KnowledgeBaseEntry['sourceType'], TranslationKey> = {
  author: 'history.list.view_profile',
  journal: 'history.list.view_details',
  research: 'history.list.view_report',
};

export const sourceTypeTitleKey = (sourceType: KnowledgeBaseEntry['sourceType']): TranslationKey =>
  TITLE_KEYS[sourceType];

export const sourceTypeQuickViewKey = (
  sourceType: KnowledgeBaseEntry['sourceType'],
): TranslationKey => QUICK_VIEW_KEYS[sourceType];

export const sourceTypeListViewKey = (
  sourceType: KnowledgeBaseEntry['sourceType'],
): TranslationKey => LIST_VIEW_KEYS[sourceType];

export const articlesFoundLabelKey = (
  sourceType: KnowledgeBaseEntry['sourceType'],
): TranslationKey =>
  sourceType === 'author' ? 'history.quick.publications_found' : 'history.quick.articles_found';

const takeTop3 = <T>(items: T[] | undefined, project: (item: T) => string): string[] =>
  (items ?? []).slice(0, 3).map(project);

export const keywordsForEntry = (entry: KnowledgeBaseEntry): string[] => {
  switch (entry.sourceType) {
    case 'research':
      return takeTop3(entry.report.overallKeywords, (kw) => kw.keyword);
    case 'author':
      return takeTop3(entry.profile.coreConcepts, (c) => c.concept);
    case 'journal':
      return (entry.journalProfile.focusAreas ?? []).slice(0, 3);
    default: {
      const _exhaustive: never = entry;
      return _exhaustive;
    }
  }
};

export const historyEntryIcon = (sourceType: KnowledgeBaseEntry['sourceType']) => {
  switch (sourceType) {
    case 'author':
      return { Icon: AuthorIcon, color: 'text-accent-magenta' };
    case 'journal':
      return { Icon: BookOpenIcon, color: 'text-green-400' };
    case 'research':
      return { Icon: DocumentIcon, color: 'text-brand-accent' };
    default: {
      const _exhaustive: never = sourceType;
      return _exhaustive;
    }
  }
};
