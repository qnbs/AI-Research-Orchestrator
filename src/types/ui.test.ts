import { describe, it, expect } from 'vitest';
import { VIEWS, isView } from './ui';

describe('View route ids', () => {
  it('isView accepts every VIEWS member and rejects unknown hashes', () => {
    for (const view of VIEWS) {
      expect(isView(view)).toBe(true);
    }
    expect(isView('not-a-view')).toBe(false);
    expect(isView('')).toBe(false);
  });
});
