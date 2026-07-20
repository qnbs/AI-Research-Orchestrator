/**
 * Utility functions for the Non-AI Programmatic Research Engine.
 * Pure, testable helpers for tokenization, scoring, and normalization.
 */

import { ALL_STOPWORDS, EN_STOPWORDS, DE_STOPWORDS } from './stopwords';

/** Tokenize text into meaningful tokens. */
export function tokenize(text: string, language: 'en' | 'de' | 'all' = 'all'): string[] {
  const stopwords =
    language === 'en' ? EN_STOPWORDS : language === 'de' ? DE_STOPWORDS : ALL_STOPWORDS;

  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 2 && !stopwords.has(t));
}

/** Simple Porter-like stemmer for English (lightweight, no external deps). */
export function stem(token: string): string {
  // Basic stemming rules for common scientific suffixes
  // Order matters: remove longer suffixes first
  let result = token;
  // Remove -tion, -sion, -ness, -ment, -ance, -ence
  result = result.replace(/(tion|sion|ness|ment|ance|ence)$/i, '');
  // Remove -ing (but keep for short words to avoid over-stemming)
  if (result.length > 5) {
    result = result.replace(/ing$/i, '');
  }
  // Remove -ies -> -y (studies -> study)
  result = result.replace(/ies$/i, 'y');
  // Remove -ed, -ly, -er, -est
  result = result.replace(/(ed|ly|er|est)$/i, '');
  // Remove -es, -s (plural markers)
  result = result.replace(/es$/i, '');
  result = result.replace(/s$/i, '');
  // Remove -ia -> -i
  result = result.replace(/ia$/i, 'i');
  return result;
}

/** Normalize text for comparison (lowercase, trim, normalize whitespace). */
export function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

/** Calculate term frequency in a document. */
export function termFrequency(term: string, tokens: string[]): number {
  const stemmed = stem(term.toLowerCase());
  const count = tokens.filter((t) => stem(t) === stemmed).length;
  return count / tokens.length;
}

/** Calculate inverse document frequency. */
export function inverseDocumentFrequency(
  _term: string,
  documentCount: number,
  totalDocuments: number,
): number {
  const idf = Math.log(totalDocuments / (1 + documentCount));
  return idf;
}

/** BM25 scoring parameters. */
export interface Bm25Params {
  k1: number;
  b: number;
  avgDocLength: number;
}

/** Default BM25 parameters optimized for scientific abstracts. */
export const DEFAULT_BM25_PARAMS: Bm25Params = {
  k1: 1.2,
  b: 0.75,
  avgDocLength: 150,
};

/** Calculate BM25 score for a term in a document. */
export function bm25Score(
  termFreq: number,
  docLength: number,
  avgDocLength: number,
  idf: number,
  params: Bm25Params = DEFAULT_BM25_PARAMS,
): number {
  const k1 = params.k1;
  const b = params.b;
  const numerator = termFreq * (k1 + 1);
  const denominator = termFreq + k1 * (1 - b + b * (docLength / avgDocLength));
  return idf * (numerator / denominator);
}

/** Normalize score to 0-100 range. */
export function normalizeScore(score: number, min: number, max: number): number {
  if (max === min) return 50;
  return Math.max(0, Math.min(100, ((score - min) / (max - min)) * 100));
}

/** Calculate recency decay factor (newer = higher score). */
export function recencyDecayFactor(
  pubYear: string | number,
  currentYear: number = new Date().getFullYear(),
): number {
  const year = typeof pubYear === 'string' ? parseInt(pubYear, 10) : pubYear;
  if (isNaN(year)) return 0.5;
  const age = currentYear - year;
  // Exponential decay: 1.0 for current year, ~0.5 for 5 years, ~0.25 for 10 years
  return Math.exp(-age / 5);
}

/** Check if publication type indicates high-quality evidence. */
export function isHighQualityPubType(pubTypes: string[]): boolean {
  const highQualityTypes = [
    'systematic review',
    'meta-analysis',
    'randomized controlled trial',
    'clinical trial',
    'review',
    'clinical study',
  ];
  return pubTypes.some((pt) => highQualityTypes.some((hq) => pt.toLowerCase().includes(hq)));
}

/** Extract publication year from date string. */
export function extractYear(dateStr: string): number | null {
  const match = dateStr.match(/\d{4}/);
  return match ? parseInt(match[0], 10) : null;
}

/** Simple Jaccard similarity between two sets of tokens. */
export function jaccardSimilarity(tokens1: string[], tokens2: string[]): number {
  const set1 = new Set(tokens1.map((t) => stem(t)));
  const set2 = new Set(tokens2.map((t) => stem(t)));
  const intersection = [...set1].filter((t) => set2.has(t)).length;
  const union = new Set([...set1, ...set2]).size;
  return union === 0 ? 0 : intersection / union;
}

/** Cosine similarity between two token frequency maps. */
export function cosineSimilarity(
  freq1: Record<string, number>,
  freq2: Record<string, number>,
): number {
  const allTerms = new Set([...Object.keys(freq1), ...Object.keys(freq2)]);
  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;

  for (const term of allTerms) {
    const f1 = freq1[term] || 0;
    const f2 = freq2[term] || 0;
    dotProduct += f1 * f2;
    magnitude1 += f1 * f1;
    magnitude2 += f2 * f2;
  }

  if (magnitude1 === 0 || magnitude2 === 0) return 0;
  return dotProduct / (Math.sqrt(magnitude1) * Math.sqrt(magnitude2));
}
