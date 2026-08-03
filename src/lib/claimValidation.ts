/**
 * Claim-level synthesis trust validation (P0-6).
 * Corpus membership alone is insufficient — claims need lexical evidence overlap.
 */

import type {
  ClaimValidationState,
  GroundedClaim,
  RankedArticle,
  SynthesisTrustLevel,
} from '../types';
import { corpusContainsDemo } from './articleSourceClass';
import { partitionCorpusCitations } from './citationGrounding';
import {
  corpusKeysFromArticles,
  ensureGroundedClaim,
  findArticleByCorpusKey,
} from './sourceIdentifier';
import { normalizeClaimValidationState } from './synthesisTrustTerminology';

export type ClaimTrustMetrics = {
  totalClaims: number;
  claimSupportedClaims: number;
  unverifiedClaims: number;
  rejectedClaims: number;
  invalidCitationCount: number;
  /** Share of cited PMIDs whose article text lexically supports the claim. */
  citationPrecision: number;
  /**
   * Share of claims that reached claim-supported validation
   * (claim-level recall of supported statements).
   */
  citationRecall: number;
  unsupportedClaimRate: number;
  irrelevantCitationRate: number;
  /** Alias of citation precision for source-relevance reporting (0–1). */
  sourceRelevance: number;
};

const TOKEN_MIN_LEN = 3;
const MIN_EVIDENCE_TOKENS = 2;

function tokenize(text: string): Set<string> {
  const normalized = text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  const tokens = normalized
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= TOKEN_MIN_LEN);
  return new Set(tokens);
}

function countTokenOverlap(left: Set<string>, right: Set<string>): number {
  let overlap = 0;
  for (const token of left) {
    if (right.has(token)) overlap += 1;
  }
  return overlap;
}

/** Whether article text plausibly supports the claim (lexical overlap heuristic). */
export function articleSupportsClaim(claimText: string, article: RankedArticle): boolean {
  const claimTokens = tokenize(claimText);
  if (claimTokens.size === 0) return false;
  const corpusText = `${article.title} ${article.summary ?? ''}`;
  const articleTokens = tokenize(corpusText);
  return countTokenOverlap(claimTokens, articleTokens) >= MIN_EVIDENCE_TOKENS;
}

function stableClaimId(text: string, pmids: readonly string[]): string {
  const slug = text.slice(0, 48).replace(/\s+/g, '-').toLowerCase();
  return `claim-${pmids.join('-')}-${slug}`;
}

export type ValidatedClaimResult = GroundedClaim & {
  validationState: ClaimValidationState;
  evidenceSnippets?: string[];
};

/**
 * Validate one claim: corpus-bound PMIDs plus evidence overlap in source text.
 */
export function validateClaimAgainstCorpus(
  claim: GroundedClaim,
  corpusArticles: readonly RankedArticle[],
): ValidatedClaimResult {
  const normalized = ensureGroundedClaim(claim);
  const corpusIds = corpusKeysFromArticles(corpusArticles);
  const { valid, invalid } = partitionCorpusCitations(corpusIds, normalized.pmids);
  const id = normalized.id ?? stableClaimId(normalized.text, valid);

  if (valid.length === 0) {
    return {
      ...normalized,
      id,
      pmids: [],
      validationState: 'rejected',
      evidenceSnippets: [],
    };
  }

  const supporting: string[] = [];
  for (const pmid of valid) {
    const article = findArticleByCorpusKey(corpusArticles, pmid);
    if (article && articleSupportsClaim(normalized.text, article)) {
      const snippet = (article.summary ?? article.title).slice(0, 160);
      supporting.push(`${pmid}: ${snippet}`);
    }
  }

  const hasEvidence = supporting.length > 0;
  const validationState: ClaimValidationState = hasEvidence
    ? 'claim-supported'
    : invalid.length > 0
      ? 'rejected'
      : 'unverified';

  return {
    ...normalized,
    id,
    pmids: valid,
    validationState,
    evidenceSnippets: supporting.length > 0 ? supporting : undefined,
  };
}

export type SynthesisTrustAssessment = {
  claims: ValidatedClaimResult[];
  trustLevel: SynthesisTrustLevel;
  metrics: ClaimTrustMetrics;
};

/** Assess trust for a set of claims against the retrieval corpus. */
export function assessSynthesisTrust(
  claims: readonly GroundedClaim[],
  corpusArticles: readonly RankedArticle[],
  mode: 'extractive-template' | 'narrative-extracted',
): SynthesisTrustAssessment {
  const validated = claims.map((c) => validateClaimAgainstCorpus(c, corpusArticles));
  const metrics = computeClaimTrustMetrics(validated, corpusArticles);

  // Synthetic demo fixtures must never receive elevated corpus-supported trust.
  const demoCorpus = corpusContainsDemo(corpusArticles);
  if (demoCorpus) {
    const demoted = validated.map((c) =>
      c.validationState === 'claim-supported'
        ? { ...c, validationState: 'unverified' as const }
        : c,
    );
    return {
      claims: demoted,
      trustLevel: 'narrative-draft',
      metrics: computeClaimTrustMetrics(demoted, corpusArticles),
    };
  }

  const allClaimSupported =
    validated.length > 0 && validated.every((c) => c.validationState === 'claim-supported');
  const trustLevel: SynthesisTrustLevel =
    mode === 'extractive-template' && allClaimSupported ? 'corpus-supported' : 'narrative-draft';

  return { claims: validated, trustLevel, metrics };
}

export function computeClaimTrustMetrics(
  claims: readonly ValidatedClaimResult[],
  corpusArticles: readonly RankedArticle[],
): ClaimTrustMetrics {
  const corpusIds = corpusKeysFromArticles(corpusArticles);
  let invalidCitationCount = 0;
  let claimSupportedClaims = 0;
  let unverifiedClaims = 0;
  let rejectedClaims = 0;
  let citedPmids = 0;
  let irrelevantPmids = 0;

  for (const claim of claims) {
    const { invalid } = partitionCorpusCitations(corpusIds, claim.pmids);
    invalidCitationCount += invalid.length;

    const state = normalizeClaimValidationState(claim.validationState);
    if (state === 'claim-supported') claimSupportedClaims += 1;
    else if (state === 'unverified') unverifiedClaims += 1;
    else rejectedClaims += 1;

    for (const pmid of claim.pmids) {
      citedPmids += 1;
      const article = findArticleByCorpusKey(corpusArticles, pmid);
      // Out-of-corpus PMIDs are non-supporting (same bucket as lexically irrelevant).
      if (!article || !articleSupportsClaim(claim.text, article)) {
        irrelevantPmids += 1;
      }
    }
  }

  const totalClaims = claims.length;
  const citationPrecision = citedPmids === 0 ? 1 : (citedPmids - irrelevantPmids) / citedPmids;
  const citationRecall = totalClaims === 0 ? 1 : claimSupportedClaims / totalClaims;
  const unsupportedClaimRate =
    totalClaims === 0 ? 0 : (unverifiedClaims + rejectedClaims) / totalClaims;
  const irrelevantCitationRate = citedPmids === 0 ? 0 : irrelevantPmids / citedPmids;

  return {
    totalClaims,
    claimSupportedClaims,
    unverifiedClaims,
    rejectedClaims,
    invalidCitationCount,
    citationPrecision,
    citationRecall,
    unsupportedClaimRate,
    irrelevantCitationRate,
    sourceRelevance: citationPrecision,
  };
}
