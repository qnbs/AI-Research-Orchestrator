/**
 * Structural validation for PubMed query strings produced by the query builder.
 * Detects malformed Boolean syntax before queries are sent to NCBI.
 */

export interface PubMedQueryValidationResult {
  valid: boolean;
  errors: string[];
}

const ADJACENT_BOOLEAN = /\b(OR|AND|NOT)\s+(OR|AND|NOT)\b/i;
const EMPTY_GROUP = /\(\s*\)/;
const LEADING_GROUP_OP = /\(\s*(OR|AND|NOT)\b/i;
const TRAILING_GROUP_OP = /\b(OR|AND|NOT)\s*\)/i;
const EMPTY_QUOTED_TERM = /""\s*\[/;
const EMPTY_MESH_TAG = /""\[MeSH Terms\]/;

/** Validate a PubMed query string for structural defects. */
export function validatePubMedQuery(query: string): PubMedQueryValidationResult {
  const errors: string[] = [];
  const trimmed = query.trim();

  if (trimmed.length === 0) {
    errors.push('empty query');
  }

  if (ADJACENT_BOOLEAN.test(trimmed)) {
    errors.push('adjacent boolean operators');
  }

  if (EMPTY_GROUP.test(trimmed)) {
    errors.push('empty parenthesized group');
  }

  if (LEADING_GROUP_OP.test(trimmed)) {
    errors.push('boolean operator immediately after opening parenthesis');
  }

  if (TRAILING_GROUP_OP.test(trimmed)) {
    errors.push('boolean operator immediately before closing parenthesis');
  }

  if (EMPTY_QUOTED_TERM.test(trimmed) || EMPTY_MESH_TAG.test(trimmed)) {
    errors.push('empty quoted field term');
  }

  const openParens = (trimmed.match(/\(/g) ?? []).length;
  const closeParens = (trimmed.match(/\)/g) ?? []).length;
  if (openParens !== closeParens) {
    errors.push('unbalanced parentheses');
  }

  return { valid: errors.length === 0, errors };
}

/** Throw when a query fails structural validation. */
export function assertValidPubMedQuery(query: string): void {
  const result = validatePubMedQuery(query);
  if (!result.valid) {
    throw new Error(`Invalid PubMed query: ${result.errors.join(', ')}`);
  }
}
