/**
 * Honest synthesis trust terminology (ADR 0018).
 *
 * Lexical corpus overlap is claim/corpus support — not bibliographic verification.
 * Writers emit the new wire values; readers accept legacy `'verified'`.
 */

import type { ClaimValidationState, GroundedSynthesis, SynthesisTrustLevel } from '../types';

/** Normalize persisted/imported claim validation wire values. */
export function normalizeClaimValidationState(raw: unknown): ClaimValidationState {
  if (raw === 'claim-supported' || raw === 'verified') return 'claim-supported';
  if (raw === 'rejected') return 'rejected';
  return 'unverified';
}

/** Normalize persisted/imported synthesis trust wire values. */
export function normalizeSynthesisTrustLevel(raw: unknown): SynthesisTrustLevel | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (raw === 'corpus-supported' || raw === 'verified') return 'corpus-supported';
  if (raw === 'narrative-draft') return 'narrative-draft';
  return 'narrative-draft';
}

/** True when trust was (or is) the elevated corpus-support level. */
export function isElevatedSynthesisTrust(raw: unknown): boolean {
  return raw === 'corpus-supported' || raw === 'verified';
}

/** Rewrite groundedSynthesis wire values from legacy `'verified'` to honest labels. */
export function migrateGroundedSynthesisTrustTerminology(
  grounded: GroundedSynthesis | undefined,
): GroundedSynthesis | undefined {
  if (!grounded) return grounded;
  const trustLevel = normalizeSynthesisTrustLevel(grounded.trustLevel);
  const claims = grounded.claims.map((claim) => ({
    ...claim,
    validationState:
      claim.validationState === undefined
        ? undefined
        : normalizeClaimValidationState(claim.validationState),
  }));
  return {
    ...grounded,
    ...(trustLevel !== undefined ? { trustLevel } : {}),
    claims,
  };
}
