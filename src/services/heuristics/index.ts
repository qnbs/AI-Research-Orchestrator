/**
 * Public façade for the local heuristic inference layer.
 * All exports are pure / deterministic and share types with the live Gemini path.
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
  selectDemoArticlesForTopic,
  buildDemoResearchReport,
  createDemoKnowledgeBaseEntries,
  isDemoEntryId,
  syntheticPmid,
} from './sampleData';
export { generateHeuristicResearchReportStream, type HeuristicStreamEvent } from './researchStream';

export { tokenize, meaningfulTokens, jaccard, cosineBag, tokenSet, splitSentences } from './utils';
