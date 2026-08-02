/**
 * Offline agent eval harness (P1-4).
 * Scores structured Gemini-like outputs against golden fixtures without network calls.
 */

import { measureCitationGrounding, partitionCorpusCitations } from './citationGrounding';
import { computeClaimTrustMetrics } from './claimValidation';
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
    /** Maximum unsupported-claim rate (0–1) from claim validation metrics. */
    maxUnsupportedClaimRate?: number;
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

  if (exp.rankedCorpusPmids?.length) {
    const obj =
      actual !== null && typeof actual === 'object' && !Array.isArray(actual)
        ? (actual as Record<string, unknown>)
        : null;
    const ranked =
      obj && Array.isArray(obj.rankedArticles) ? (obj.rankedArticles as { pmid?: string }[]) : [];
    const corpus = new Set(exp.rankedCorpusPmids);
    const invalid = ranked.filter(
      (r) => !r || typeof r.pmid !== 'string' || r.pmid.trim().length === 0 || !corpus.has(r.pmid),
    );
    dimensions.push({
      dimension: 'rankedCorpus',
      passed: invalid.length === 0,
      detail: invalid.length
        ? `out-of-corpus: ${invalid.map((r) => r.pmid).join(', ')}`
        : undefined,
    });
  }

  if (exp.maxUnsupportedClaimRate != null) {
    const obj =
      actual !== null && typeof actual === 'object' && !Array.isArray(actual)
        ? (actual as Record<string, unknown>)
        : null;
    const grounded = obj?.groundedSynthesis as GroundedSynthesis | undefined;
    const ranked =
      obj && Array.isArray(obj.rankedArticles)
        ? (obj.rankedArticles as { pmid?: string; title?: string; summary?: string }[])
        : [];
    const claims = grounded?.claims ?? [];
    const metrics = computeClaimTrustMetrics(
      claims.map((c) => ({
        ...c,
        validationState: c.validationState ?? 'unverified',
      })),
      ranked.map((r) => ({
        pmid: r.pmid ?? '',
        title: r.title ?? '',
        authors: '',
        journal: '',
        pubYear: '0000',
        summary: r.summary ?? '',
        relevanceScore: 0,
        relevanceExplanation: '',
        keywords: [],
        isOpenAccess: false,
      })),
    );
    const passed = metrics.unsupportedClaimRate <= exp.maxUnsupportedClaimRate;
    dimensions.push({
      dimension: 'groundedSynthesis',
      passed,
      detail: passed
        ? undefined
        : `unsupportedClaimRate=${metrics.unsupportedClaimRate.toFixed(2)} max<=${exp.maxUnsupportedClaimRate}`,
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
