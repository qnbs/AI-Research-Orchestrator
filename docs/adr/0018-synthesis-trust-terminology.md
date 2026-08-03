# ADR 0018: Synthesis Trust Terminology

## Status

Accepted — 2026-08-03

## Context

Claim validation performs corpus membership checks plus lexical overlap against retrieved abstracts. That is useful **claim/corpus support**, not a bibliographic audit or human verification. The wire values `ClaimValidationState = 'verified'` and `SynthesisTrustLevel = 'verified'` overstated the guarantee even after UI copy was softened to “Corpus-supported synthesis”.

## Decision

1. Canonical claim state: `'claim-supported' | 'unverified' | 'rejected'`.
2. Canonical report trust: `'corpus-supported' | 'narrative-draft'`.
3. Writers emit only the new values.
4. Readers accept legacy `'verified'` via `normalizeClaimValidationState` / `normalizeSynthesisTrustLevel` (`src/lib/synthesisTrustTerminology.ts`).
5. Dexie v7 eagerly rewrites persisted nested report JSON from `'verified'` to the new labels.
6. Import continues to force `narrative-draft` and never elevates trust from external files.
7. Synthetic demo corpora still never receive elevated corpus-supported trust.

## Consequences

- Types, metrics (`claimSupportedClaims`), UI keys (`report.synthesis.corpusSupportedBanner`), and README language stay aligned with the actual validation strength.
- Historical audit prose may still say “verified”; runtime and new docs use the honest terminology.

## References

- ADR 0015 (grounded synthesis schema)
- ADR 0016 (demo quarantine never elevates trust)
- `src/lib/claimValidation.ts`
- `src/lib/synthesisTrustTerminology.ts`
