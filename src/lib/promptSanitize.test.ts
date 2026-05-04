import { describe, it, expect } from 'vitest';
import { sanitizePromptFragment } from './promptSanitize';

describe('sanitizePromptFragment', () => {
  it('trims and strips control characters', () => {
    expect(sanitizePromptFragment('  hello\x00world  ')).toBe('helloworld');
  });

  it('clamps very long input', () => {
    const long = 'a'.repeat(100);
    expect(sanitizePromptFragment(long, 20).length).toBeLessThanOrEqual(22);
  });
});
