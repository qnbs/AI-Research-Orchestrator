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
import { partitionCorpusCitations } from './citationGrounding';

export type ClaimTrustMetrics = {
  totalClaims: number;
  verifiedClaims: number;
  unverifiedClaims: number;
  rejectedClaims: number;
  invalidCitationCount: number;
  citationPrecision: number;
  unsupportedClaimRate: number;
  irrelevantCitationRate: number;
};

const TOKEN_MIN_LEN = 3;
const MIN_EVIDENCE_TOKENS = 2;

function tokenize(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
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
  const corpusText = `${article.title} ${article.summary ?? ''} ${article.aiSummary ?? ''}`;
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
  const corpusIds = new Set(corpusArticles.map((a) => a.pmid));
  const { valid, invalid } = partitionCorpusCitations(corpusIds, claim.pmids);
  const id = claim.id ?? stableClaimId(claim.text, valid);

  if (valid.length === 0) {
    return {
      ...claim,
      id,
      pmids: [],
      validationState: 'rejected',
      evidenceSnippets: [],
    };
  }

  const supporting: string[] = [];
  for (const pmid of valid) {
    const article = corpusArticles.find((a) => a.pmid === pmid);
    if (article && articleSupportsClaim(claim.text, article)) {
      const snippet = (article.summary ?? article.title).slice(0, 160);
      supporting.push(`${pmid}: ${snippet}`);
    }
  }

  const hasEvidence = supporting.length > 0;
  const validationState: ClaimValidationState = hasEvidence
    ? 'verified'
    : invalid.length > 0
      ? 'rejected'
      : 'unverified';

  return {
    ...claim,
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

  const allVerified =
    validated.length > 0 && validated.every((c) => c.validationState === 'verified');
  const trustLevel: SynthesisTrustLevel =
    mode === 'extractive-template' && allVerified ? 'verified' : 'narrative-draft';

  return { claims: validated, trustLevel, metrics };
}

export function computeClaimTrustMetrics(
  claims: readonly ValidatedClaimResult[],
  corpusArticles: readonly RankedArticle[],
): ClaimTrustMetrics {
  const corpusIds = new Set(corpusArticles.map((a) => a.pmid));
  let invalidCitationCount = 0;
  let verifiedClaims = 0;
  let unverifiedClaims = 0;
  let rejectedClaims = 0;
  let citedPmids = 0;
  let irrelevantPmids = 0;

  for (const claim of claims) {
    const { invalid } = partitionCorpusCitations(corpusIds, claim.pmids);
    invalidCitationCount += invalid.length;

    if (claim.validationState === 'verified') verifiedClaims += 1;
    else if (claim.validationState === 'unverified') unverifiedClaims += 1;
    else rejectedClaims += 1;

    for (const pmid of claim.pmids) {
      citedPmids += 1;
      const article = corpusArticles.find((a) => a.pmid === pmid);
      if (article && !articleSupportsClaim(claim.text, article)) {
        irrelevantPmids += 1;
      }
    }
  }

  const totalClaims = claims.length;
  const citationPrecision = citedPmids === 0 ? 1 : (citedPmids - irrelevantPmids) / citedPmids;
  const unsupportedClaimRate =
    totalClaims === 0 ? 0 : (unverifiedClaims + rejectedClaims) / totalClaims;
  const irrelevantCitationRate = citedPmids === 0 ? 0 : irrelevantPmids / citedPmids;

  return {
    totalClaims,
    verifiedClaims,
    unverifiedClaims,
    rejectedClaims,
    invalidCitationCount,
    citationPrecision,
    unsupportedClaimRate,
    irrelevantCitationRate,
  };
}
