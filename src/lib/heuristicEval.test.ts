import { describe, it, expect } from 'vitest';
import { runHeuristicEvalHarness, heuristicEvalFixtures } from './heuristicEval';

describe('heuristicEval harness', () => {
  it('exposes golden fixtures', () => {
    expect(heuristicEvalFixtures().length).toBeGreaterThanOrEqual(3);
  });

  it('passes offline heuristic eval suite', () => {
    const { passed, results } = runHeuristicEvalHarness();
    expect(results.every((r) => r.dimensions.length > 0)).toBe(true);
    expect(passed).toBe(true);
  });
});
