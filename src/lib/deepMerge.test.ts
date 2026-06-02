import { describe, it, expect } from 'vitest';
import { deepMergeRecords } from './deepMerge';

describe('deepMergeRecords', () => {
  it('merges nested plain objects without mutating inputs', () => {
    const target = { a: 1, nested: { x: 1, y: 2 } };
    const source = { b: 2, nested: { y: 99, z: 3 } };
    const result = deepMergeRecords(target, source);
    expect(result).toEqual({ a: 1, b: 2, nested: { x: 1, y: 99, z: 3 } });
    expect(target).toEqual({ a: 1, nested: { x: 1, y: 2 } });
  });

  it('replaces arrays and primitives from source', () => {
    const result = deepMergeRecords({ list: [1], flag: false }, { list: [2, 3], flag: true });
    expect(result).toEqual({ list: [2, 3], flag: true });
  });
});
