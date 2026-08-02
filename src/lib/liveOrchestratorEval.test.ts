import { describe, it, expect } from 'vitest';
import { runLiveOrchestratorEvalHarness } from './liveOrchestratorEval';

describe('liveOrchestratorEval', () => {
  it('passes recorded orchestrator retrieval fixtures', () => {
    const { passed, results } = runLiveOrchestratorEvalHarness();
    expect(passed, JSON.stringify(results, null, 2)).toBe(true);
  });
});
