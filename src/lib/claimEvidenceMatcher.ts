/**
 * Conservative deterministic claim–corpus evidence matcher (P1 claim integrity).
 * Not full natural-language inference — filters weak overlap, negation, and direction conflicts.
 */

import type { RankedArticle } from '../types';
import { stem } from '../services/nonAi/utils';

/** Bump when matcher semantics change (exported in validation results). */
export const CLAIM_EVIDENCE_MATCHER_VERSION = '2.1.0';

const TOKEN_MIN_LEN = 3;

/** High-frequency EN/DE function words excluded from overlap counting. */
const STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'by',
  'from',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'can',
  'this',
  'that',
  'these',
  'those',
  'it',
  'its',
  'they',
  'their',
  'we',
  'our',
  'as',
  'than',
  'also',
  'into',
  'over',
  'under',
  'between',
  'during',
  'after',
  'before',
  'about',
  'through',
  'not',
  'no',
  'nor',
  'only',
  'both',
  'each',
  'other',
  'such',
  'very',
  'just',
  'more',
  'most',
  'some',
  'any',
  'all',
  'one',
  'two',
  'three',
  'first',
  'second',
  'new',
  'old',
  'der',
  'die',
  'das',
  'den',
  'dem',
  'des',
  'ein',
  'eine',
  'einer',
  'eines',
  'einem',
  'einen',
  'und',
  'oder',
  'aber',
  'mit',
  'von',
  'zu',
  'im',
  'am',
  'auf',
  'als',
  'auch',
  'nicht',
  'kein',
  'keine',
  'sich',
  'sie',
  'wir',
  'ihr',
  'bei',
  'nach',
  'vor',
  'uber',
  'unter',
  'durch',
  'wurde',
  'wurden',
  'wird',
  'werden',
  'ist',
  'sind',
  'war',
  'waren',
  'haben',
  'hat',
  'hatte',
  'study',
  'studies',
  'trial',
  'trials',
  'patients',
  'patient',
  'adults',
  'adult',
  'results',
  'result',
  'analysis',
  'data',
  'method',
  'methods',
  'background',
  'conclusion',
  'conclusions',
  'objective',
  'objectives',
  'significant',
  'significantly',
  'compared',
  'versus',
  'among',
  'using',
  'used',
  'based',
  'showed',
  'found',
  'associated',
  'related',
]);

const NEGATION_MARKERS = new Set([
  'not',
  'no',
  'never',
  'without',
  'lack',
  'lacking',
  'neither',
  'nor',
  'nicht',
  'kein',
  'keine',
  'keinen',
  'ohne',
  'niemals',
]);

/** Direction / comparator terms — mismatched pairs imply contradiction. */
const DIRECTION_TERMS: Record<string, string[]> = {
  increase: [
    'decrease',
    'decreased',
    'reduced',
    'reduction',
    'lower',
    'lowered',
    'decline',
    'declined',
  ],
  increased: [
    'decrease',
    'decreased',
    'reduced',
    'reduction',
    'lower',
    'lowered',
    'decline',
    'declined',
  ],
  higher: ['lower', 'lowered', 'decreased', 'reduced'],
  improve: ['worsen', 'worsened', 'worsening', 'deteriorate', 'deteriorated'],
  improved: ['worsen', 'worsened', 'worsening', 'deteriorate', 'deteriorated'],
  effective: ['ineffective', 'ineffectiveness'],
  benefit: ['harm', 'harmful', 'adverse'],
  beneficial: ['harmful', 'adverse', 'detrimental'],
  reduce: ['increase', 'increased', 'elevated', 'raise', 'raised'],
  reduced: ['increase', 'increased', 'elevated', 'raise', 'raised'],
  decrease: ['increase', 'increased', 'elevated', 'raise', 'raised'],
  decreased: ['increase', 'increased', 'elevated', 'raise', 'raised'],
  positive: ['negative'],
  prevent: ['cause', 'caused', 'induce', 'induced'],
  prevented: ['caused', 'induced'],
};

export type EvidenceSpan = {
  field: 'title' | 'abstract';
  quote: string;
  start: number;
  end: number;
};

export type EvidenceRelation = 'supports' | 'contradicts' | 'mentions' | 'insufficient';

export type ClaimArticleEvidence = {
  relation: EvidenceRelation;
  spans: EvidenceSpan[];
  contentOverlapCount: number;
  reasons: string[];
};

function normalizeForTokenize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

function tokenizeContent(text: string): string[] {
  const normalized = normalizeForTokenize(text);
  return normalized
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= TOKEN_MIN_LEN && !STOPWORDS.has(t))
    .map(stem);
}

function uniqueTokens(tokens: string[]): Set<string> {
  return new Set(tokens);
}

function countOverlap(left: Set<string>, right: Set<string>): number {
  let overlap = 0;
  for (const token of left) {
    if (right.has(token)) overlap += 1;
  }
  return overlap;
}

function hasNegationNear(tokens: string[], index: number): boolean {
  const windowStart = Math.max(0, index - 3);
  for (let i = windowStart; i < index; i += 1) {
    if (NEGATION_MARKERS.has(tokens[i])) return true;
  }
  return false;
}

function detectDirectionConflict(claimTokens: string[], articleTokens: string[]): boolean {
  const claimSet = new Set(claimTokens.map(stem));
  const articleSet = new Set(articleTokens.map(stem));
  for (const [term, opposites] of Object.entries(DIRECTION_TERMS)) {
    const stemmedTerm = stem(term);
    if (!claimSet.has(stemmedTerm)) continue;
    for (const opposite of opposites) {
      if (articleSet.has(stem(opposite))) return true;
    }
  }
  for (const [term, opposites] of Object.entries(DIRECTION_TERMS)) {
    const stemmedTerm = stem(term);
    if (!articleSet.has(stemmedTerm)) continue;
    for (const opposite of opposites) {
      if (claimSet.has(stem(opposite))) return true;
    }
  }
  return false;
}

function detectNegationConflict(claimText: string, articleText: string): boolean {
  const claimTokens = normalizeForTokenize(claimText)
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const articleTokens = normalizeForTokenize(articleText)
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const claimContent = tokenizeContent(claimText);
  const articleContentSet = uniqueTokens(tokenizeContent(articleText));
  const overlapping = claimContent.filter((t) => articleContentSet.has(t));

  for (const token of overlapping) {
    const claimIdx = claimTokens.indexOf(token);
    const articleIdx = articleTokens.indexOf(token);
    if (claimIdx < 0 || articleIdx < 0) continue;
    const claimNegated = hasNegationNear(claimTokens, claimIdx);
    const articleNegated = hasNegationNear(articleTokens, articleIdx);
    if (claimNegated !== articleNegated) return true;
  }
  return false;
}

function extractEvidenceSpan(
  field: 'title' | 'abstract',
  sourceText: string,
  overlapTokens: Set<string>,
): EvidenceSpan | undefined {
  if (overlapTokens.size === 0 || sourceText.length === 0) return undefined;

  const segments = sourceText.split(/(?<=[.!?])\s+/);
  let bestSegment = sourceText;
  let bestScore = 0;

  for (const segment of segments) {
    const segmentTokens = uniqueTokens(tokenizeContent(segment));
    const score = countOverlap(overlapTokens, segmentTokens);
    if (score > bestScore) {
      bestScore = score;
      bestSegment = segment;
    }
  }

  const trimmed = bestSegment.trim();
  if (trimmed.length === 0) return undefined;

  const start = sourceText.indexOf(bestSegment);
  const end = start >= 0 ? start + bestSegment.length : trimmed.length;
  const quote = start >= 0 ? sourceText.slice(start, end) : trimmed;

  return {
    field,
    quote: quote.trim(),
    start: start >= 0 ? start : 0,
    end: start >= 0 ? end : trimmed.length,
  };
}

function corpusTextFields(article: RankedArticle): { field: 'title' | 'abstract'; text: string }[] {
  const fields: { field: 'title' | 'abstract'; text: string }[] = [];
  if (article.title?.trim()) fields.push({ field: 'title', text: article.title });
  const abstract = article.summary?.trim();
  if (abstract) fields.push({ field: 'abstract', text: abstract });
  return fields;
}

/** Assess whether article text conservatively supports, contradicts, or only weakly mentions a claim. */
export function assessClaimArticleEvidence(
  claimText: string,
  article: RankedArticle,
): ClaimArticleEvidence {
  const reasons: string[] = [];
  const claimContent = tokenizeContent(claimText);
  const claimContentSet = uniqueTokens(claimContent);

  if (claimContentSet.size === 0) {
    return {
      relation: 'insufficient',
      spans: [],
      contentOverlapCount: 0,
      reasons: ['claim has no substantive content tokens'],
    };
  }

  const fields = corpusTextFields(article);
  if (fields.length === 0) {
    return {
      relation: 'insufficient',
      spans: [],
      contentOverlapCount: 0,
      reasons: ['article has no title or abstract text'],
    };
  }

  type FieldOverlap = {
    field: 'title' | 'abstract';
    text: string;
    overlapTokens: Set<string>;
    overlapCount: number;
    span?: EvidenceSpan;
  };

  const fieldOverlaps: FieldOverlap[] = [];
  const aggregatedOverlap = new Set<string>();

  for (const { field, text } of fields) {
    const articleContent = tokenizeContent(text);
    const articleSet = uniqueTokens(articleContent);
    const overlapTokens = new Set<string>();
    for (const token of claimContentSet) {
      if (articleSet.has(token)) overlapTokens.add(token);
    }
    for (const token of overlapTokens) aggregatedOverlap.add(token);
    fieldOverlaps.push({
      field,
      text,
      overlapTokens,
      overlapCount: overlapTokens.size,
      span: overlapTokens.size > 0 ? extractEvidenceSpan(field, text, overlapTokens) : undefined,
    });
  }

  const totalOverlap = aggregatedOverlap.size;
  const overlapRatio = totalOverlap / claimContentSet.size;
  const meetsThreshold = totalOverlap >= 3 || (totalOverlap >= 2 && overlapRatio >= 0.35);

  if (!meetsThreshold) {
    const bestFieldOverlap = fieldOverlaps.reduce(
      (best, current) => (current.overlapCount > best.overlapCount ? current : best),
      fieldOverlaps[0],
    );
    return {
      relation: 'insufficient',
      spans: [],
      contentOverlapCount: bestFieldOverlap?.overlapCount ?? 0,
      reasons: ['content token overlap below conservative threshold'],
    };
  }

  let bestContradictSpan: EvidenceSpan | undefined;
  let bestContradictOverlap = 0;
  let bestReportSpan: EvidenceSpan | undefined;
  let bestReportOverlap = 0;
  let hasDirectionConflict = false;
  let hasNegationConflict = false;

  for (const fieldOverlap of fieldOverlaps) {
    if (fieldOverlap.overlapCount === 0) continue;

    if (fieldOverlap.overlapCount > bestReportOverlap) {
      bestReportOverlap = fieldOverlap.overlapCount;
      bestReportSpan = fieldOverlap.span;
    }

    const evidenceText = fieldOverlap.span?.quote?.trim() || fieldOverlap.text;
    if (detectDirectionConflict(claimContent, tokenizeContent(evidenceText))) {
      hasDirectionConflict = true;
      if (fieldOverlap.overlapCount > bestContradictOverlap) {
        bestContradictOverlap = fieldOverlap.overlapCount;
        bestContradictSpan = fieldOverlap.span;
      }
    }
    if (detectNegationConflict(claimText, evidenceText)) {
      hasNegationConflict = true;
      if (fieldOverlap.overlapCount > bestContradictOverlap) {
        bestContradictOverlap = fieldOverlap.overlapCount;
        bestContradictSpan = fieldOverlap.span;
      }
    }
  }

  if (hasDirectionConflict || hasNegationConflict) {
    if (hasDirectionConflict) {
      reasons.push('direction or comparator terms conflict between claim and source');
    }
    if (hasNegationConflict) {
      reasons.push('negation scope differs between claim and source');
    }
    return {
      relation: 'contradicts',
      spans: bestContradictSpan ? [bestContradictSpan] : [],
      contentOverlapCount: totalOverlap,
      reasons,
    };
  }

  return {
    relation: 'supports',
    spans: bestReportSpan ? [bestReportSpan] : [],
    contentOverlapCount: totalOverlap,
    reasons: ['conservative lexical evidence overlap'],
  };
}

/** Whether article text plausibly supports the claim (conservative matcher). */
export function articleSupportsClaim(claimText: string, article: RankedArticle): boolean {
  return assessClaimArticleEvidence(claimText, article).relation === 'supports';
}
