/**
 * Lightweight offline agent eval harness (P1-4).
 * Scores structured Gemini-like outputs against golden fixtures without network calls.
 */

export type EvalDimension = 'schema' | 'requiredFields' | 'citationGrounding' | 'length';

export interface EvalCase {
  id: string;
  description: string;
  /** Parsed model output (already JSON). */
  actual: unknown;
  /** Expected shape / constraints. */
  expect: {
    type?: 'object' | 'array';
    requiredKeys?: string[];
    /** PMIDs that must appear somewhere in JSON stringification when present. */
    mustCitePmids?: string[];
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

  if (exp.mustCitePmids?.length) {
    // JSON.stringify(undefined) === undefined; keep includes() safe
    const blob = JSON.stringify(actual) ?? '';
    const missing = exp.mustCitePmids.filter((pmid) => !blob.includes(pmid));
    dimensions.push({
      dimension: 'citationGrounding',
      passed: missing.length === 0,
      detail: missing.length ? `uncited: ${missing.join(', ')}` : undefined,
    });
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
