/**
 * Claim-level synthesis trust validation (P0-6 / P1 claim integrity).
 * Corpus membership alone is insufficient — claims need conservative evidence assessment.
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
  CLAIM_EVIDENCE_MATCHER_VERSION,
  assessClaimArticleEvidence,
  articleSupportsClaim,
} from './claimEvidenceMatcher';
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

export type ValidatedClaimResult = GroundedClaim & {
  validationState: ClaimValidationState;
  evidenceSnippets?: string[];
  /** Out-of-corpus citation ids preserved for metrics and export (not stripped). */
  invalidCitations?: string[];
  /**
   * All corpus-valid keys originally cited by the model before support filtering.
   * Metrics must use this (not trimmed `pmids`) so irrelevant in-corpus citations count.
   */
  citedValidSourceKeys?: string[];
  matcherVersion?: string;
};

function stableClaimId(text: string, pmids: readonly string[]): string {
  const slug = text.slice(0, 48).replace(/\s+/g, '-').toLowerCase();
  return `claim-${pmids.join('-')}-${slug}`;
}

function formatEvidenceSnippet(sourceKey: string, quote: string): string {
  const trimmed = quote.trim();
  if (trimmed.length <= 200) return `${sourceKey}: ${trimmed}`;
  return `${sourceKey}: ${trimmed.slice(0, 197)}...`;
}

/**
 * Validate one claim: corpus-bound PMIDs plus conservative evidence in source text.
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
      invalidCitations: invalid.length > 0 ? invalid : undefined,
      validationState: 'rejected',
      evidenceSnippets: [],
      matcherVersion: CLAIM_EVIDENCE_MATCHER_VERSION,
    };
  }

  const supporting: string[] = [];
  const contradicting: string[] = [];
  const snippets: string[] = [];

  for (const pmid of valid) {
    const article = findArticleByCorpusKey(corpusArticles, pmid);
    if (!article) continue;
    const evidence = assessClaimArticleEvidence(normalized.text, article);
    if (evidence.relation === 'supports') {
      supporting.push(pmid);
      const span = evidence.spans[0];
      if (span) {
        snippets.push(formatEvidenceSnippet(pmid, span.quote));
      } else {
        snippets.push(formatEvidenceSnippet(pmid, article.summary ?? article.title));
      }
    } else if (evidence.relation === 'contradicts') {
      contradicting.push(pmid);
      const span = evidence.spans[0];
      if (span) {
        snippets.push(formatEvidenceSnippet(pmid, span.quote));
      }
    }
  }

  let validationState: ClaimValidationState;
  let resultPmids: string[];

  if (supporting.length > 0) {
    validationState = 'claim-supported';
    resultPmids = supporting;
  } else if (contradicting.length > 0) {
    validationState = 'rejected';
    resultPmids = valid;
  } else {
    validationState = 'unverified';
    resultPmids = valid;
  }

  return {
    ...normalized,
    id,
    pmids: resultPmids,
    citedValidSourceKeys: valid,
    invalidCitations: invalid.length > 0 ? invalid : undefined,
    validationState,
    evidenceSnippets: snippets.length > 0 ? snippets : undefined,
    matcherVersion: CLAIM_EVIDENCE_MATCHER_VERSION,
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
    const partitioned = partitionCorpusCitations(corpusIds, claim.pmids);
    const invalid = claim.invalidCitations ?? partitioned.invalid;
    invalidCitationCount += invalid.length;

    const state = normalizeClaimValidationState(claim.validationState);
    if (state === 'claim-supported') claimSupportedClaims += 1;
    else if (state === 'unverified') unverifiedClaims += 1;
    else rejectedClaims += 1;

    const validCited = claim.citedValidSourceKeys ?? partitioned.valid;
    const allCitedKeys = [...validCited, ...invalid];
    for (const pmid of allCitedKeys) {
      citedPmids += 1;
      const article = findArticleByCorpusKey(corpusArticles, pmid);
      if (!article || !articleSupportsClaim(claim.text, article)) {
        irrelevantPmids += 1;
      }
    }
  }

  const totalClaims = claims.length;
  // No citations evaluated → precision/relevance are undefined; use 0 so floors cannot vacuous-pass.
  const citationPrecision = citedPmids === 0 ? 0 : (citedPmids - irrelevantPmids) / citedPmids;
  const citationRecall = totalClaims === 0 ? 0 : claimSupportedClaims / totalClaims;
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

// Re-export for tests and downstream callers.
export { articleSupportsClaim } from './claimEvidenceMatcher';
