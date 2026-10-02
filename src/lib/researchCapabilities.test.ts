import { describe, expect, it } from 'vitest';
import { deriveResearchCapabilities } from './researchCapabilities';
import type { InferenceModeSnapshot } from '../services/inferenceMode';

function snap(partial: Partial<InferenceModeSnapshot>): InferenceModeSnapshot {
  return {
    mode: 'heuristic',
    reason: 'no_api_key',
    hasApiKey: false,
    isOnline: true,
    forceHeuristic: false,
    provider: 'gemini',
    ...partial,
  };
}

describe('deriveResearchCapabilities', () => {
  it('marks retrieval offline when the browser is offline', () => {
    const caps = deriveResearchCapabilities({
      snapshot: snap({ isOnline: false, mode: 'live', reason: 'offline', hasApiKey: true }),
      includeArxiv: true,
    });
    expect(caps.retrieval.pubmed).toBe('offline');
    expect(caps.retrieval.arxiv).toBe('offline');
    expect(caps.canRunFullLiteratureReview).toBe(false);
    expect(caps.canAnalyzeLocalContent).toBe(true);
  });

  it('remote cloud provider with key and online → remote-ai-ready + full review', () => {
    const caps = deriveResearchCapabilities({
      snapshot: snap({
        mode: 'live',
        reason: 'live',
        hasApiKey: true,
        provider: 'gemini',
      }),
      includeArxiv: false,
    });
    expect(caps.providerReadiness).toBe('remote-ai-ready');
    expect(caps.retrieval.arxiv).toBe('disabled');
    expect(caps.retrieval.pubmed).toBe('online');
    expect(caps.canRunFullLiteratureReview).toBe(true);
  });

  it('Ollama live keeps local-ai-ready while retrieval stays network-backed', () => {
    const caps = deriveResearchCapabilities({
      snapshot: snap({
        mode: 'live',
        reason: 'live',
        hasApiKey: true,
        provider: 'ollama',
      }),
      includeArxiv: true,
    });
    expect(caps.providerReadiness).toBe('local-ai-ready');
    expect(caps.retrieval.pubmed).toBe('online');
    expect(caps.canRunFullLiteratureReview).toBe(true);
  });

  it('heuristic mode still allows online retrieval when browser is online', () => {
    const caps = deriveResearchCapabilities({
      snapshot: snap({
        mode: 'heuristic',
        reason: 'force',
        forceHeuristic: true,
        provider: 'heuristic',
      }),
      includeArxiv: true,
    });
    expect(caps.providerReadiness).toBe('heuristic-ready');
    expect(caps.canRunFullLiteratureReview).toBe(true);
  });

  it('missing API key uses heuristic-ready but can fetch when online', () => {
    const caps = deriveResearchCapabilities({
      snapshot: snap({ mode: 'heuristic', reason: 'no_api_key', hasApiKey: false }),
      includeArxiv: true,
    });
    expect(caps.providerReadiness).toBe('heuristic-ready');
    expect(caps.canRunFullLiteratureReview).toBe(true);
  });
});
