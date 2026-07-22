/**
 * Types for the Non-AI Programmatic Research Engine.
 * Provides shared interfaces for deterministic, offline-capable literature research.
 */

import type { RankedArticle } from '../../types';

/** Badge string for Non-AI (deterministic) mode outputs. */
export const HEURISTIC_BADGE = 'Heuristic mode';

/** Query builder output with explanation. */
export interface BuiltQuery {
  /** The constructed PubMed E-utilities query string. */
  query: string;
  /** Human-readable explanation of query construction. */
  explanation: string;
  /** Detected MeSH terms used in query. */
  meshTerms: string[];
  /** Detected synonyms/phrases expanded. */
  expandedTerms: string[];
}

/** Retrieval result from PubMed and arXiv. */
export interface RetrievalResult {
  /** Articles fetched from PubMed. */
  pubmedArticles: RankedArticle[];
  /** Articles fetched from arXiv. */
  arxivArticles: RankedArticle[];
  /** Total count from PubMed. */
  pubmedCount: number;
  /** Total count from arXiv. */
  arxivCount: number;
  /** API calls made (for rate limiting awareness). */
  apiCalls: number;
}

/** Ranking feature weights for BM25/TF-IDF hybrid. */
export interface RankingWeights {
  /** Weight for MeSH overlap score (0-1). */
  meshOverlap: number;
  /** Weight for publication type boost (0-1). */
  pubTypeBoost: number;
  /** Weight for recency decay (0-1). */
  recencyDecay: number;
  /** Weight for open access preference (0-1). */
  openAccess: number;
  /** Weight for keyword density (0-1). */
  keywordDensity: number;
}

/** Default ranking weights optimized for systematic reviews. */
export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  meshOverlap: 0.3,
  pubTypeBoost: 0.25,
  recencyDecay: 0.2,
  openAccess: 0.15,
  keywordDensity: 0.1,
};

/** Scoring explanation for a ranked article. */
export interface ScoringExplanation {
  /** Base BM25/TF-IDF score (0-100). */
  baseScore: number;
  /** MeSH overlap contribution. */
  meshOverlap: number;
  /** Publication type boost applied. */
  pubTypeBoost: number;
  /** Recency decay factor. */
  recencyDecay: number;
  /** Open access bonus. */
  openAccess: number;
  /** Keyword density score. */
  keywordDensity: number;
  /** Human-readable explanation. */
  explanation: string;
}

/** Extractive synthesis result. */
export interface ExtractiveSynthesis {
  /** TL;DR summary (extracted sentences). */
  tldr: string;
  /** Key findings with PMID citations. */
  keyFindings: Array<{
    pmid: string;
    sentence: string;
    score: number;
  }>;
  /** Synthesis mode identifier. */
  synthesisMode: 'extractive-template';
}

/** Chat session interface shared by live-provider and Non-AI adapters. */
export interface ReportChatSession {
  sendMessageStream(params: {
    message: string;
  }): Promise<AsyncGenerator<{ text?: string }, void, unknown>>;
}

/** Template-based narrative section. */
export interface NarrativeSection {
  /** Section title. */
  title: string;
  /** Section content with embedded citations. */
  content: string;
  /** PMIDs referenced in this section. */
  pmids: string[];
}
