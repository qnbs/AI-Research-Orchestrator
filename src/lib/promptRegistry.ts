/**
 * Prompt versioning registry (P2-4).
 * Every Gemini system/user prompt builder should reference a stable id + version
 * so eval harnesses and AUDIT trails can pin behavior across releases.
 */

export const PROMPT_CATALOG_VERSION = '2026.07.16' as const;

export const PromptId = {
  ORCHESTRATOR_SYSTEM: 'orchestrator.system',
  ORCHESTRATOR_QUERY_GEN: 'orchestrator.query_gen',
  SIMILAR_ARTICLES: 'assistant.similar_articles',
  RELATED_ONLINE: 'assistant.related_online',
  TLDR: 'assistant.tldr',
  RESEARCH_ANALYSIS: 'assistant.research_analysis',
  AUTHOR_DISAMBIGUATE: 'authors.disambiguate',
  AUTHOR_PROFILE: 'authors.profile',
  AUTHOR_SUGGEST: 'authors.suggest',
  ARTICLE_ANALYZE: 'articles.analyze',
  JOURNAL_PROFILE: 'journals.profile',
  REPORT_CHAT: 'chat.report',
} as const;

export type PromptIdValue = (typeof PromptId)[keyof typeof PromptId];

export interface PromptMeta {
  id: PromptIdValue;
  catalogVersion: typeof PROMPT_CATALOG_VERSION;
}

/** Embed a machine-readable prompt tag for logs / evals (ignored by models as noise). */
export function promptTag(id: PromptIdValue): string {
  return `[prompt:${id}@${PROMPT_CATALOG_VERSION}]`;
}

export function describePrompt(id: PromptIdValue): PromptMeta {
  return { id, catalogVersion: PROMPT_CATALOG_VERSION };
}
