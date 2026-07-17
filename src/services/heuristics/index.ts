/**
 * Public façade for the local heuristic inference layer.
 * Pure heuristic primitives (query, rank, synthesize templates, etc.) are deterministic.
 * `generateHeuristicResearchReportStream` may call PubMed/arXiv when online; offline it
 * uses the curated demo corpus (ADR 0007).
 */

export type {
  HeuristicProvenance,
  HeuristicArticleInput,
  HeuristicOptions,
  ReportChatSession,
  HeuristicResearchReport,
} from './types';
export { HEURISTIC_BADGE } from './types';

export { formulatePubMedQuery, formulateQueries } from './queryFormulation';
export {
  scoreArticleRelevance,
  rankArticles,
  classifyArticleType,
  aggregateKeywords,
  generateInsights,
} from './ranking';
export { extractKeywords } from './keywords';
export { generateHeuristicTldr, extractKeySentences } from './summarization';
export { synthesizeReportMarkdown, streamSynthesisChunks } from './synthesis';
export { findSimilarArticlesHeuristic } from './similarArticles';
export {
  disambiguateAuthorHeuristic,
  generateAuthorProfileHeuristic,
  suggestAuthorsHeuristic,
} from './authorDisambiguation';
export { generateJournalProfileHeuristic, analyzeArticleHeuristic } from './journalProfiling';
export {
  generateResearchAnalysisHeuristic,
  findRelatedOnlineHeuristic,
  answerFromReport,
  createHeuristicChatSession,
} from './chat';
export {
  DEMO_CORPUS,
  DEMO_ENTRY_PREFIX,
  DEMO_DISMISS_STORAGE_KEY,
  DEMO_SEEDED_STORAGE_KEY,
  selectDemoArticlesForTopic,
  buildDemoResearchReport,
  createDemoKnowledgeBaseEntries,
  isDemoEntryId,
  isDemoPmid,
  syntheticPmid,
  resolveHeuristicArticleByPmid,
} from './sampleData';
export {
  generateHeuristicResearchReportStream,
  type HeuristicStreamEvent,
  type HeuristicStreamOptions,
} from './researchStream';

export { tokenize, meaningfulTokens, jaccard, cosineBag, tokenSet, splitSentences } from './utils';
