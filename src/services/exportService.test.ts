import { describe, it, expect } from 'vitest';
import { sanitizeCsvFormulaInjection } from './exportService';

describe('sanitizeCsvFormulaInjection', () => {
  it('prefixes formula-risk starters', () => {
    expect(sanitizeCsvFormulaInjection('=1+1')).toBe('\t=1+1');
    expect(sanitizeCsvFormulaInjection('+sum')).toBe('\t+sum');
    expect(sanitizeCsvFormulaInjection('-x')).toBe('\t-x');
    expect(sanitizeCsvFormulaInjection('@ref')).toBe('\t@ref');
  });

  it('leaves safe strings', () => {
    expect(sanitizeCsvFormulaInjection('normal')).toBe('normal');
    expect(sanitizeCsvFormulaInjection(' PMID123')).toBe(' PMID123');
  });
});
