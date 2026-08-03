/**
 * Offline agent eval harness (P1-4).
 * Scores structured Gemini-like outputs against golden fixtures without network calls.
 */

import { measureCitationGrounding, partitionCorpusCitations } from './citationGrounding';
import { computeClaimTrustMetrics, validateClaimAgainstCorpus } from './claimValidation';
import type { GroundedSynthesis } from '../types';
import { validatePubMedQuery } from './pubmedQueryValidator';

export type EvalDimension =
  | 'schema'
  | 'requiredFields'
  | 'citationGrounding'
  | 'length'
  | 'rankedCorpus'
  | 'groundedSynthesis'
  | 'pubmedQuery';

export interface EvalCase {
  id: string;
  description: string;
  /** Parsed model output (already JSON) or a query string for pubmedQuery dimension. */
  actual: unknown;
  /** Expected shape / constraints. */
  expect: {
    type?: 'object' | 'array';
    requiredKeys?: string[];
    /** PMIDs that must appear somewhere in JSON stringification when present. */
    mustCitePmids?: string[];
    /** Corpus PMIDs every rankedArticles[].pmid must belong to. */
    rankedCorpusPmids?: string[];
    /** PMIDs that must appear in rankedArticles (order-independent). */
    mustRankPmids?: string[];
    /** Minimum number of rankedArticles entries. */
    minRankedArticles?: number;
    /** Maximum unsupported-claim rate (0–1) from claim validation metrics. */
    maxUnsupportedClaimRate?: number;
    /** Minimum citation precision (0–1) — cited PMIDs with lexical evidence. */
    minCitationPrecision?: number;
    /** Minimum claim-level citation recall (claim-supported / total claims). */
    minCitationRecall?: number;
    /** Maximum irrelevant-citation rate (0–1). */
    maxIrrelevantCitationRate?: number;
    /** Minimum source relevance (alias of citation precision). */
    minSourceRelevance?: number;
    /** Minimum grounded claims with valid corpus PMIDs. */
    minGroundedClaims?: number;
    /** PubMed query string to validate structurally. */
    pubmedQuery?: boolean;
    /** When false, query must fail validation (default true). */
    pubmedQueryValid?: boolean;
    minStringLength?: number;
    maxStringLength?: number;
    stringPath?: string;
  };
}

export interface EvalDimensionResult {
  dimension: EvalDimension;
  passed: boolean;
  detail?: string;
}

export interface EvalCaseResult {
  id: string;
  passed: boolean;
  dimensions: EvalDimensionResult[];
}

function getByPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/** Evaluate one offline fixture case. */
export function evaluateCase(testCase: EvalCase): EvalCaseResult {
  const dimensions: EvalDimensionResult[] = [];
  const { actual, expect: exp } = testCase;

  if (exp.type) {
    const ok =
      exp.type === 'array' ? Array.isArray(actual) : actual !== null && typeof actual === 'object';
    dimensions.push({
      dimension: 'schema',
      passed: ok,
      detail: ok ? undefined : `expected ${exp.type}`,
    });
  }

  if (exp.requiredKeys?.length) {
    const obj = actual as Record<string, unknown> | null;
    const missing =
      obj && typeof obj === 'object' && !Array.isArray(obj)
        ? exp.requiredKeys.filter((k) => !(k in obj))
        : exp.requiredKeys;
    dimensions.push({
      dimension: 'requiredFields',
      passed: missing.length === 0,
      detail: missing.length ? `missing: ${missing.join(', ')}` : undefined,
    });
  }

  if (exp.pubmedQuery) {
    if (typeof actual !== 'string') {
      dimensions.push({
        dimension: 'pubmedQuery',
        passed: exp.pubmedQueryValid === false,
        detail: 'expected string query',
      });
    } else {
      const result = validatePubMedQuery(actual);
      const shouldBeValid = exp.pubmedQueryValid !== false;
      const passed = result.valid === shouldBeValid;
      dimensions.push({
        dimension: 'pubmedQuery',
        passed,
        detail: passed ? undefined : result.errors.join(', ') || 'expected invalid query',
      });
    }
  }

  if (exp.rankedCorpusPmids?.length || exp.mustRankPmids?.length || exp.minRankedArticles != null) {
    const obj =
      actual !== null && typeof actual === 'object' && !Array.isArray(actual)
        ? (actual as Record<string, unknown>)
        : null;
    const rankedRaw = obj && Array.isArray(obj.rankedArticles) ? obj.rankedArticles : [];
    const ranked = rankedRaw.filter(
      (r): r is { pmid?: string } => r !== null && typeof r === 'object' && !Array.isArray(r),
    );
    const failures: string[] = [];

    if (exp.rankedCorpusPmids?.length) {
      const corpus = new Set(exp.rankedCorpusPmids);
      const invalid = rankedRaw.filter((r) => {
        if (!r || typeof r !== 'object' || Array.isArray(r)) return true;
        const pmid = (r as { pmid?: unknown }).pmid;
        return typeof pmid !== 'string' || pmid.trim().length === 0 || !corpus.has(pmid);
      });
      if (invalid.length) {
        failures.push(
          `out-of-corpus: ${invalid
            .map((r) =>
              r &&
              typeof r === 'object' &&
              !Array.isArray(r) &&
              typeof (r as { pmid?: unknown }).pmid === 'string'
                ? (r as { pmid: string }).pmid
                : '<invalid>',
            )
            .join(', ')}`,
        );
      }
    }

    if (exp.minRankedArticles != null && ranked.length < exp.minRankedArticles) {
      failures.push(`rankedCount=${ranked.length} required>=${exp.minRankedArticles}`);
    }

    if (exp.mustRankPmids?.length) {
      const present = new Set(
        ranked
          .map((r) => r.pmid)
          .filter((id): id is string => typeof id === 'string' && id.length > 0),
      );
      const missing = exp.mustRankPmids.filter((pmid) => !present.has(pmid));
      if (missing.length) {
        failures.push(`missing ranked PMIDs: ${missing.join(', ')}`);
      }
    }

    dimensions.push({
      dimension: 'rankedCorpus',
      passed: failures.length === 0,
      detail: failures.length ? failures.join('; ') : undefined,
    });
  }

  const needsClaimMetrics =
    exp.maxUnsupportedClaimRate != null ||
    exp.minCitationPrecision != null ||
    exp.minCitationRecall != null ||
    exp.maxIrrelevantCitationRate != null ||
    exp.minSourceRelevance != null;

  if (needsClaimMetrics) {
    const obj =
      actual !== null && typeof actual === 'object' && !Array.isArray(actual)
        ? (actual as Record<string, unknown>)
        : null;
    const grounded = obj?.groundedSynthesis as GroundedSynthesis | undefined;
    const rankedRaw = obj && Array.isArray(obj.rankedArticles) ? obj.rankedArticles : null;
    const claimsRaw = grounded && Array.isArray(grounded.claims) ? grounded.claims : null;
    const failures: string[] = [];

    if (
      rankedRaw === null &&
      obj &&
      'rankedArticles' in obj &&
      !Array.isArray(obj.rankedArticles)
    ) {
      failures.push('rankedArticles must be an array when present');
    }
    if (grounded && grounded.claims !== undefined && claimsRaw === null) {
      failures.push('groundedSynthesis.claims must be an array when present');
    }

    const ranked = (rankedRaw ?? []).filter(
      (r): r is { pmid?: string; title?: string; summary?: string } =>
        r !== null && typeof r === 'object' && !Array.isArray(r),
    );
    // Absent/empty claims must not vacuous-pass metric floors (perfect recall on []).
    const claims = (claimsRaw ?? []).filter(
      (c): c is NonNullable<typeof c> => c !== null && typeof c === 'object' && !Array.isArray(c),
    );

    if (failures.length === 0 && claims.length === 0) {
      failures.push('no claims evaluated (missing or empty groundedSynthesis.claims)');
    }

    if (failures.length === 0) {
      const corpusArticles = ranked.map((r) => ({
        pmid: typeof r.pmid === 'string' ? r.pmid : '',
        title: typeof r.title === 'string' ? r.title : '',
        authors: '',
        journal: '',
        pubYear: '0000',
        summary: typeof r.summary === 'string' ? r.summary : '',
        relevanceScore: 0,
        relevanceExplanation: '',
        keywords: [],
        isOpenAccess: false,
      }));
      // Recompute validationState from corpus evidence — do not trust model-supplied states.
      const validatedClaims = claims.map((c) =>
        validateClaimAgainstCorpus(
          {
            text: typeof c.text === 'string' ? c.text : '',
            pmids: Array.isArray(c.pmids)
              ? c.pmids.filter((p): p is string => typeof p === 'string')
              : [],
          },
          corpusArticles,
        ),
      );
      const metrics = computeClaimTrustMetrics(validatedClaims, corpusArticles);

      if (
        exp.maxUnsupportedClaimRate != null &&
        metrics.unsupportedClaimRate > exp.maxUnsupportedClaimRate
      ) {
        failures.push(
          `unsupportedClaimRate=${metrics.unsupportedClaimRate.toFixed(2)} max<=${exp.maxUnsupportedClaimRate}`,
        );
      }
      if (
        exp.minCitationPrecision != null &&
        metrics.citationPrecision < exp.minCitationPrecision
      ) {
        failures.push(
          `citationPrecision=${metrics.citationPrecision.toFixed(2)} min>=${exp.minCitationPrecision}`,
        );
      }
      if (exp.minCitationRecall != null && metrics.citationRecall < exp.minCitationRecall) {
        failures.push(
          `citationRecall=${metrics.citationRecall.toFixed(2)} min>=${exp.minCitationRecall}`,
        );
      }
      if (
        exp.maxIrrelevantCitationRate != null &&
        metrics.irrelevantCitationRate > exp.maxIrrelevantCitationRate
      ) {
        failures.push(
          `irrelevantCitationRate=${metrics.irrelevantCitationRate.toFixed(2)} max<=${exp.maxIrrelevantCitationRate}`,
        );
      }
      if (exp.minSourceRelevance != null && metrics.sourceRelevance < exp.minSourceRelevance) {
        failures.push(
          `sourceRelevance=${metrics.sourceRelevance.toFixed(2)} min>=${exp.minSourceRelevance}`,
        );
      }
    }

    dimensions.push({
      dimension: 'groundedSynthesis',
      passed: failures.length === 0,
      detail: failures.length ? failures.join('; ') : undefined,
    });
  }

  if (exp.minGroundedClaims != null) {
    const obj =
      actual !== null && typeof actual === 'object' && !Array.isArray(actual)
        ? (actual as Record<string, unknown>)
        : null;
    const grounded = obj?.groundedSynthesis as GroundedSynthesis | undefined;
    const ranked =
      obj && Array.isArray(obj.rankedArticles) ? (obj.rankedArticles as { pmid?: string }[]) : [];
    const corpus = new Set(
      exp.rankedCorpusPmids?.length
        ? exp.rankedCorpusPmids
        : ranked.map((r) => r.pmid).filter((id): id is string => Boolean(id)),
    );
    const claims = grounded?.claims ?? [];
    const validClaims = claims.filter((c) => {
      if (!c || !Array.isArray(c.pmids)) return false;
      const { valid } = partitionCorpusCitations(corpus, c.pmids);
      return valid.length > 0;
    });
    const passed = validClaims.length >= exp.minGroundedClaims;
    dimensions.push({
      dimension: 'groundedSynthesis',
      passed,
      detail: passed
        ? undefined
        : `validClaims=${validClaims.length} required>=${exp.minGroundedClaims}`,
    });
  }

  if (exp.mustCitePmids?.length) {
    const obj =
      actual !== null && typeof actual === 'object' && !Array.isArray(actual)
        ? (actual as Record<string, unknown>)
        : null;
    const insights =
      obj && Array.isArray(obj.aiGeneratedInsights)
        ? (obj.aiGeneratedInsights as { supportingArticles?: string[] }[])
        : [];
    const ranked =
      obj && Array.isArray(obj.rankedArticles) ? (obj.rankedArticles as { pmid?: string }[]) : [];
    const corpus = new Set<string>([
      ...ranked.map((r) => r.pmid).filter((id): id is string => Boolean(id)),
      ...exp.mustCitePmids,
    ]);

    if (insights.length === 0) {
      dimensions.push({
        dimension: 'citationGrounding',
        passed: false,
        detail: 'no insights with supportingArticles',
      });
    } else {
      const { citationValidity, citationCompleteness } = measureCitationGrounding(
        corpus,
        insights as { question: string; answer: string; supportingArticles: string[] }[],
      );
      const requiredPresent = exp.mustCitePmids.every((pmid) =>
        insights.some((i) => (i.supportingArticles ?? []).includes(pmid)),
      );
      const passed = citationValidity === 1 && citationCompleteness === 1 && requiredPresent;
      dimensions.push({
        dimension: 'citationGrounding',
        passed,
        detail: passed
          ? undefined
          : `validity=${citationValidity.toFixed(2)} completeness=${citationCompleteness.toFixed(2)} required=${requiredPresent}`,
      });
    }
  }

  if (exp.stringPath && (exp.minStringLength != null || exp.maxStringLength != null)) {
    const value = getByPath(actual, exp.stringPath);
    const text = typeof value === 'string' ? value : '';
    const minOk = exp.minStringLength == null || text.length >= exp.minStringLength;
    const maxOk = exp.maxStringLength == null || text.length <= exp.maxStringLength;
    dimensions.push({
      dimension: 'length',
      passed: minOk && maxOk,
      detail: `len=${text.length}`,
    });
  }

  return {
    id: testCase.id,
    passed: dimensions.every((d) => d.passed),
    dimensions,
  };
}

/** Run a suite and return aggregate pass rate. */
export function runEvalSuite(cases: EvalCase[]): {
  results: EvalCaseResult[];
  passRate: number;
} {
  const results = cases.map(evaluateCase);
  const passed = results.filter((r) => r.passed).length;
  return {
    results,
    passRate: cases.length === 0 ? 1 : passed / cases.length,
  };
}

/** CI gate: all fixtures must pass (used by check:agent-eval). */
export function assertEvalSuitePasses(cases: EvalCase[]): void {
  const { results, passRate } = runEvalSuite(cases);
  if (passRate < 1) {
    const failed = results.filter((r) => !r.passed);
    throw new Error(
      `agent-eval failed: ${failed
        .map(
          (f) =>
            `${f.id} (${f.dimensions
              .filter((d) => !d.passed)
              .map((d) => d.dimension)
              .join(',')})`,
        )
        .join('; ')}`,
    );
  }
}
