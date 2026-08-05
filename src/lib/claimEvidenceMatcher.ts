/**
 * Conservative deterministic claim–corpus evidence matcher (P1 claim integrity).
 * Not full natural-language inference — filters weak overlap, negation, and direction conflicts.
 */

import type { RankedArticle } from '../types';
import { detectNumericConflict, detectPopulationConflict } from './claimEvidenceConflicts';

// NOTE: normalizeForTokenize/stemToken/rawWordTokens below are intentionally NOT
// exported for reuse in claimEvidenceConflicts.ts - that would create an import cycle
// (this file already imports FROM claimEvidenceConflicts.ts above). claimEvidenceConflicts.ts
// keeps its own local copies instead, the same pattern stemToken itself already follows
// to avoid a cycle through nonAi/utils.stem.

/** Bump when matcher semantics change (exported in validation results). */
export const CLAIM_EVIDENCE_MATCHER_VERSION = '2.3.0';

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

/** Lightweight Porter-like stemmer (mirrors nonAi/utils.stem; kept local to avoid store import cycle). */
function stemToken(token: string): string {
  let result = token;
  result = result.replace(/(tion|sion|ness|ment|ance|ence)$/i, '');
  if (result.length > 5) {
    result = result.replace(/ing$/i, '');
  }
  result = result.replace(/ies$/i, 'y');
  result = result.replace(/(ed|ly|er|est)$/i, '');
  result = result.replace(/es$/i, '');
  result = result.replace(/s$/i, '');
  return result;
}

function tokenizeContent(text: string): string[] {
  const normalized = normalizeForTokenize(text);
  return normalized
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= TOKEN_MIN_LEN && !STOPWORDS.has(t))
    .map(stemToken);
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
    if (tokens[i] === 'not' && tokens[i + 1] === 'only') continue;
    if (NEGATION_MARKERS.has(tokens[i])) return true;
  }
  return false;
}

function findAllStemmedTokenIndices(rawTokens: string[], stemmedToken: string): number[] {
  const indices: number[] = [];
  for (let i = 0; i < rawTokens.length; i += 1) {
    if (stemToken(rawTokens[i]) === stemmedToken) indices.push(i);
  }
  return indices;
}

function detectDirectionConflict(claimTokens: string[], articleTokens: string[]): boolean {
  const claimSet = new Set(claimTokens.map(stemToken));
  const articleSet = new Set(articleTokens.map(stemToken));
  for (const [term, opposites] of Object.entries(DIRECTION_TERMS)) {
    const stemmedTerm = stemToken(term);
    if (!claimSet.has(stemmedTerm)) continue;
    for (const opposite of opposites) {
      if (articleSet.has(stemToken(opposite))) return true;
    }
  }
  for (const [term, opposites] of Object.entries(DIRECTION_TERMS)) {
    const stemmedTerm = stemToken(term);
    if (!articleSet.has(stemmedTerm)) continue;
    for (const opposite of opposites) {
      if (claimSet.has(stemToken(opposite))) return true;
    }
  }
  return false;
}

function isDirectionStem(stemmed: string): boolean {
  for (const [term, opposites] of Object.entries(DIRECTION_TERMS)) {
    if (stemToken(term) === stemmed) return true;
    for (const opposite of opposites) {
      if (stemToken(opposite) === stemmed) return true;
    }
  }
  return false;
}

function claimTokensForDirectionCheck(
  claimContent: string[],
  overlapTokens: Set<string>,
  evidenceTokens: string[],
): string[] {
  const evidenceSet = new Set(evidenceTokens.map(stemToken));
  const scoped = new Set<string>();
  for (const token of claimContent) {
    if (overlapTokens.has(token)) scoped.add(token);
    if (!isDirectionStem(token)) continue;
    for (const [term, opposites] of Object.entries(DIRECTION_TERMS)) {
      if (stemToken(term) !== token) continue;
      for (const opposite of opposites) {
        if (evidenceSet.has(stemToken(opposite))) scoped.add(token);
      }
    }
    for (const [term, opposites] of Object.entries(DIRECTION_TERMS)) {
      for (const opposite of opposites) {
        if (stemToken(opposite) !== token) continue;
        if (evidenceSet.has(stemToken(term))) scoped.add(token);
      }
    }
  }
  return [...scoped];
}

/** Raw (unstemmed, unstopworded) word tokens — for markers that must stay out of
 * lexical-overlap scoring (negation, population) but still need presence checks. */
function rawWordTokens(text: string): string[] {
  return normalizeForTokenize(text)
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Conservative like the other cross-occurrence checks in this file (see
 * detectNumericConflict): claimIndices spans the *entire* claim while articleTokens is
 * already scoped to the best-matching evidence span, so a repeated token can legitimately
 * appear in an unrelated claim clause with different negation status than the clause that
 * actually aligns with the evidence. Only report a conflict when EVERY claim/article
 * occurrence pair for a token disagrees - a single agreeing pair proves at least one
 * aligned occurrence, so an unrelated mismatched clause elsewhere must not override it.
 */
function detectNegationConflict(claimText: string, articleText: string): boolean {
  const claimTokens = rawWordTokens(claimText);
  const articleTokens = rawWordTokens(articleText);

  const claimContent = tokenizeContent(claimText);
  const articleContentSet = uniqueTokens(tokenizeContent(articleText));
  const overlapping = claimContent.filter((t) => articleContentSet.has(t));

  for (const token of overlapping) {
    const claimIndices = findAllStemmedTokenIndices(claimTokens, token);
    const articleIndices = findAllStemmedTokenIndices(articleTokens, token);
    if (claimIndices.length === 0 || articleIndices.length === 0) continue;

    let hasComparablePair = false;
    let hasAgreeingPair = false;
    for (const claimIdx of claimIndices) {
      const claimNegated = hasNegationNear(claimTokens, claimIdx);
      for (const articleIdx of articleIndices) {
        const articleNegated = hasNegationNear(articleTokens, articleIdx);
        hasComparablePair = true;
        if (claimNegated === articleNegated) hasAgreeingPair = true;
      }
    }
    if (hasComparablePair && !hasAgreeingPair) return true;
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

  const fieldQualifiesAsSupport = (
    fieldOverlap: FieldOverlap,
    aggregateOverlap: number,
  ): boolean => {
    const meetsOverlap =
      fieldOverlap.overlapCount >= 2 ||
      fieldOverlap.overlapCount >= Math.ceil(aggregateOverlap / 2);
    if (!meetsOverlap) return false;
    if (fieldOverlap.field !== 'title') return true;
    const claimDirectionStems = claimContent.filter(isDirectionStem);
    if (claimDirectionStems.length === 0) return true;
    return claimDirectionStems.some((token) => fieldOverlap.overlapTokens.has(token));
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
  let hasSupportingField = false;
  let hasContradictingField = false;
  let hasDirectionConflict = false;
  let hasNegationConflict = false;
  let hasNumericConflict = false;
  let hasPopulationConflict = false;

  for (const fieldOverlap of fieldOverlaps) {
    if (fieldOverlap.overlapCount === 0) continue;

    const evidenceText = fieldOverlap.span?.quote?.trim() || fieldOverlap.text;
    const evidenceTokens = tokenizeContent(evidenceText);
    const claimDirectionTokens = claimTokensForDirectionCheck(
      claimContent,
      fieldOverlap.overlapTokens,
      evidenceTokens,
    );
    const fieldDirectionConflict = detectDirectionConflict(claimDirectionTokens, evidenceTokens);
    const fieldNegationConflict = detectNegationConflict(claimText, evidenceText);
    const fieldNumericConflict = detectNumericConflict(claimText, evidenceText);
    const fieldPopulationConflict = detectPopulationConflict(claimText, evidenceText);
    const fieldContradicts =
      fieldDirectionConflict ||
      fieldNegationConflict ||
      fieldNumericConflict ||
      fieldPopulationConflict;

    if (fieldContradicts) {
      hasContradictingField = true;
      if (fieldDirectionConflict) hasDirectionConflict = true;
      if (fieldNegationConflict) hasNegationConflict = true;
      if (fieldNumericConflict) hasNumericConflict = true;
      if (fieldPopulationConflict) hasPopulationConflict = true;
      if (fieldOverlap.overlapCount > bestContradictOverlap) {
        bestContradictOverlap = fieldOverlap.overlapCount;
        bestContradictSpan = fieldOverlap.span;
      }
      continue;
    }

    if (fieldQualifiesAsSupport(fieldOverlap, totalOverlap)) {
      hasSupportingField = true;
      if (fieldOverlap.overlapCount > bestReportOverlap) {
        bestReportOverlap = fieldOverlap.overlapCount;
        bestReportSpan = fieldOverlap.span;
      }
    }
  }

  if (hasContradictingField && !hasSupportingField) {
    if (hasDirectionConflict) {
      reasons.push('direction or comparator terms conflict between claim and source');
    }
    if (hasNegationConflict) {
      reasons.push('negation scope differs between claim and source');
    }
    if (hasNumericConflict) {
      reasons.push('numeric value conflicts between claim and source (same unit)');
    }
    if (hasPopulationConflict) {
      reasons.push('population or cohort terms conflict between claim and source');
    }
    return {
      relation: 'contradicts',
      spans: bestContradictSpan ? [bestContradictSpan] : [],
      contentOverlapCount: totalOverlap,
      reasons,
    };
  }

  if (hasContradictingField && hasSupportingField) {
    return {
      relation: 'insufficient',
      spans: bestReportSpan ? [bestReportSpan] : [],
      contentOverlapCount: totalOverlap,
      reasons: ['title and abstract provide conflicting lexical signals for this claim'],
    };
  }

  if (!hasSupportingField) {
    return {
      relation: 'insufficient',
      spans: [],
      contentOverlapCount: totalOverlap,
      reasons: ['aggregate overlap met threshold but no field aligns with claim direction'],
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
