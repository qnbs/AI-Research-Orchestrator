import { describe, it, expect } from 'vitest';
import {
  runHeuristicEvalHarness,
  heuristicEvalFixtures,
  heuristicEvalNegativeFixtures,
} from './heuristicEval';
import { evaluateCase } from './agentEval';

describe('heuristicEval harness', () => {
  it('exposes golden fixtures', () => {
    expect(heuristicEvalFixtures().length).toBeGreaterThanOrEqual(3);
  });

  it('passes offline heuristic eval suite', () => {
    const { passed, results } = runHeuristicEvalHarness();
    expect(results.every((r) => r.dimensions.length > 0)).toBe(true);
    expect(passed).toBe(true);
  });

  it('flags out-of-corpus grounded claims', () => {
    const [negative] = heuristicEvalNegativeFixtures();
    const result = evaluateCase(negative);
    expect(result.passed).toBe(false);
    expect(result.dimensions.find((d) => d.dimension === 'groundedSynthesis')?.passed).toBe(false);
  });
});
