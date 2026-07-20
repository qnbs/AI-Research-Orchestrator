/**
 * Query Builder for the Non-AI Programmatic Research Engine.
 * Constructs PubMed E-utilities queries using MeSH terms and Boolean logic.
 */

import type { BuiltQuery } from './types';
import { getMeshEntry, meshFieldTag } from './meshDictionary';
import { tokenize, normalizeText } from './utils';

/** Query building options. */
export interface QueryBuildOptions {
  /** Minimum publication year (optional). */
  minYear?: number;
  /** Maximum publication year (optional). */
  maxYear?: number;
  /** Require open access only. */
  openAccessOnly?: boolean;
  /** Include publication types filter. */
  publicationTypes?: string[];
  /** Language filter (default: 'english'). */
  language?: string;
}

/**
 * Build a PubMed query from a research topic.
 * Uses MeSH lookup, synonym expansion, and Boolean construction.
 */
export function buildQuery(topic: string, options: QueryBuildOptions = {}): BuiltQuery {
  const normalizedTopic = normalizeText(topic);
  const tokens = tokenize(normalizedTopic, 'en');

  const meshTerms: string[] = [];
  const expandedTerms: string[] = [];
  const queryParts: string[] = [];

  // Find MeSH terms in the topic
  for (const token of tokens) {
    const entry = getMeshEntry(token);
    if (entry) {
      meshTerms.push(entry.heading);
      expandedTerms.push(...entry.synonyms);
      queryParts.push(meshFieldTag(entry.heading));
    }
  }

  // If no MeSH terms found, use title/abstract search
  if (queryParts.length === 0) {
    const phrase = normalizedTopic.replace(/\s+/g, ' ');
    queryParts.push(`("${phrase}"[Title/Abstract] OR "${phrase}"[Title/Abstract])`);
  }

  // Add synonym expansion for non-MeSH terms
  const synonymParts: string[] = [];
  for (const term of expandedTerms) {
    synonymParts.push(`"${term}"[Title/Abstract]`);
  }
  if (synonymParts.length > 0) {
    queryParts.push(`(${synonymParts.slice(0, 5).join(' OR ')})`);
  }

  // Build the base query
  let query = `(${queryParts.join(' OR ')})`;

  // Add filters
  const filters: string[] = [];

  // Language filter
  if (options.language && options.language !== 'all') {
    filters.push(`"${options.language}"[Language]`);
  }

  // Date range filter
  if (options.minYear || options.maxYear) {
    const min = options.minYear || 1900;
    const max = options.maxYear || new Date().getFullYear();
    filters.push(`("${min}"[Date - Publication] : "${max}"[Date - Publication])`);
  }

  // Publication type filter
  if (options.publicationTypes && options.publicationTypes.length > 0) {
    const ptParts = options.publicationTypes.map((pt) => `"${pt}"[Publication Type]`);
    filters.push(`(${ptParts.join(' OR ')})`);
  }

  // Combine query with filters
  if (filters.length > 0) {
    query = `(${query}) AND (${filters.join(' AND ')})`;
  }

  // Build explanation
  const explanationParts: string[] = [];
  if (meshTerms.length > 0) {
    explanationParts.push(`MeSH terms: ${meshTerms.join(', ')}`);
  }
  if (expandedTerms.length > 0) {
    explanationParts.push(`Expanded synonyms: ${expandedTerms.slice(0, 5).join(', ')}`);
  }
  if (options.minYear || options.maxYear) {
    explanationParts.push(
      `Date range: ${options.minYear || 'any'}–${options.maxYear || 'present'}`,
    );
  }
  if (options.openAccessOnly) {
    explanationParts.push('Open access only');
  }

  return {
    query,
    explanation:
      explanationParts.length > 0
        ? `Query built with: ${explanationParts.join('; ')}.`
        : 'Query built using title/abstract search.',
    meshTerms,
    expandedTerms,
  };
}

/**
 * Build multiple queries for a research topic (for broader coverage).
 */
export function buildMultipleQueries(topic: string, count: number = 3): BuiltQuery[] {
  const queries: BuiltQuery[] = [];

  // Primary query with MeSH
  queries.push(buildQuery(topic, { publicationTypes: ['review', 'systematic review'] }));

  // Secondary query without MeSH restriction
  queries.push(buildQuery(topic, { minYear: new Date().getFullYear() - 5 }));

  // Tertiary query with broader terms
  queries.push(buildQuery(topic, { language: 'english' }));

  return queries.slice(0, count);
}

/**
 * Extract key phrases from a topic for query expansion.
 */
export function extractPhrases(topic: string): string[] {
  const phrases: string[] = [];
  const normalized = normalizeText(topic);

  // Look for quoted phrases
  const quotedMatches = normalized.match(/"([^"]+)"/g);
  if (quotedMatches) {
    phrases.push(...quotedMatches.map((m) => m.replace(/"/g, '')));
  }

  // Look for multi-word terms (capitalized or known patterns)
  const words = normalized.split(/\s+/);
  for (let i = 0; i < words.length - 1; i++) {
    const phrase = `${words[i]} ${words[i + 1]}`;
    if (phrase.length > 5) {
      phrases.push(phrase);
    }
  }

  return [...new Set(phrases)];
}
