import { describe, it, expect } from 'vitest';
import {
  runHeuristicEvalHarness,
  heuristicEvalFixtures,
  heuristicEvalNegativeFixtures,
} from './heuristicEval';
import { evaluateCase } from './agentEval';
import { buildDemoResearchReport, rankArticles } from '../services/nonAi';
import { generateResearchReport } from '../services/nonAi/synthesizer';

describe('heuristicEval harness', () => {
  it('exposes golden fixtures', () => {
    expect(heuristicEvalFixtures().length).toBeGreaterThanOrEqual(13);
  });

  it('labels non-demo heuristic synthesis as extractive template', () => {
    const ranked = rankArticles(
      [
        {
          pmid: '9000001',
          title: 'Statin therapy for primary prevention',
          authors: 'Lee A',
          journal: 'Lancet',
          pubYear: '2022',
          summary:
            'Statin therapy reduced LDL and cardiovascular events in primary prevention cohorts.',
          relevanceScore: 88,
          relevanceExplanation: 'On topic.',
          keywords: ['statin'],
          isOpenAccess: true,
          articleType: 'Randomized Controlled Trial',
        },
      ],
      'statin primary prevention',
    );
    const synthesis = generateResearchReport(ranked, 'statin primary prevention').synthesis;
    expect(synthesis).toMatch(/extractive template/i);
    expect(synthesis).toMatch(/not a live-model draft/i);
  });

  it('labels demo synthesis as educational synthetic demo', () => {
    const synthesis = buildDemoResearchReport('metformin diabetes').synthesis;
    expect(synthesis).toMatch(/EDUCATIONAL SYNTHETIC DEMO/i);
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
