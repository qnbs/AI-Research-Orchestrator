import { describe, it, expect } from 'vitest';
import {
  isElevatedSynthesisTrust,
  migrateGroundedSynthesisTrustTerminology,
  normalizeClaimValidationState,
  normalizeSynthesisTrustLevel,
} from './synthesisTrustTerminology';

describe('synthesisTrustTerminology', () => {
  it('maps legacy verified claim state to claim-supported', () => {
    expect(normalizeClaimValidationState('verified')).toBe('claim-supported');
    expect(normalizeClaimValidationState('claim-supported')).toBe('claim-supported');
    expect(normalizeClaimValidationState('unverified')).toBe('unverified');
    expect(normalizeClaimValidationState('rejected')).toBe('rejected');
    expect(normalizeClaimValidationState('nope')).toBe('unverified');
  });

  it('maps legacy verified trust level to corpus-supported', () => {
    expect(normalizeSynthesisTrustLevel('verified')).toBe('corpus-supported');
    expect(normalizeSynthesisTrustLevel('corpus-supported')).toBe('corpus-supported');
    expect(normalizeSynthesisTrustLevel('narrative-draft')).toBe('narrative-draft');
    expect(normalizeSynthesisTrustLevel(undefined)).toBeUndefined();
    expect(normalizeSynthesisTrustLevel('weird')).toBe('narrative-draft');
  });

  it('treats legacy and new elevated trust equally', () => {
    expect(isElevatedSynthesisTrust('verified')).toBe(true);
    expect(isElevatedSynthesisTrust('corpus-supported')).toBe(true);
    expect(isElevatedSynthesisTrust('narrative-draft')).toBe(false);
  });

  it('migrates groundedSynthesis nested verified wire values', () => {
    const legacy = {
      mode: 'extractive-template' as const,
      trustLevel: 'verified',
      claims: [
        { text: 'a', pmids: ['1'], validationState: 'verified' },
        { text: 'b', pmids: ['2'], validationState: 'unverified' as const },
      ],
    };
    const migrated = migrateGroundedSynthesisTrustTerminology(
      legacy as unknown as Parameters<typeof migrateGroundedSynthesisTrustTerminology>[0],
    );
    expect(migrated?.trustLevel).toBe('corpus-supported');
    expect(migrated?.claims[0].validationState).toBe('claim-supported');
    expect(migrated?.claims[1].validationState).toBe('unverified');
  });
});
