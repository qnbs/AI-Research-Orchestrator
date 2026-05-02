import { describe, it, expect } from 'vitest';
import themeReducer, { setTheme, cycleTheme } from './themeSlice';

describe('themeSlice', () => {
  it('setTheme', () => {
    const s = themeReducer(undefined, setTheme('matrix'));
    expect(s.current).toBe('matrix');
  });

  it('cycleTheme advances', () => {
    const s0 = themeReducer(undefined, setTheme('dark'));
    const s1 = themeReducer(s0, cycleTheme());
    expect(s1.current).toBe('light');
  });
});
