import { describe, expect, it } from 'vitest';
import type { InferenceModeSnapshot } from '../services/inferenceMode';
import type { Settings } from '../types';
import { PROMPT_CATALOG_VERSION } from './promptRegistry';
import { buildResearchExecutionContext, resolveEndpointOrigin } from './researchExecutionContext';

const liveSnapshot: InferenceModeSnapshot = {
  mode: 'live',
  reason: 'live',
  hasApiKey: true,
  isOnline: true,
  forceHeuristic: false,
  provider: 'gemini',
};

const heuristicSnapshot: InferenceModeSnapshot = {
  mode: 'heuristic',
  reason: 'offline',
  hasApiKey: true,
  isOnline: false,
  forceHeuristic: false,
  provider: 'openai',
};

const baseAi: Settings['ai'] = {
  provider: 'openai',
  model: 'gpt-4o-mini',
  customPreamble: '',
  temperature: 0.5,
  aiLanguage: 'English',
  aiPersona: 'Neutral Scientist',
  researchAssistant: {
    autoFetchSimilar: false,
    autoFetchOnline: false,
    authorSearchLimit: 10,
  },
  enableTldr: true,
  ncbiApiKey: '',
  forceHeuristicMode: false,
};

describe('researchExecutionContext', () => {
  it('freezes live provider/model and release metadata', () => {
    const ctx = buildResearchExecutionContext({
      snapshot: liveSnapshot,
      aiSettings: { ...baseAi, provider: 'gemini', model: 'gemini-2.5-flash' },
      executionId: 'fixed-id',
      startedAt: 1_700_000_000_000,
    });

    expect(ctx.executionId).toBe('fixed-id');
    expect(ctx.startedAt).toBe(1_700_000_000_000);
    expect(ctx.inferenceMode).toBe('live');
    expect(ctx.inferenceReason).toBe('live');
    expect(ctx.providerId).toBe('gemini');
    expect(ctx.model).toBe('gemini-2.5-flash');
    expect(ctx.promptRegistryVersion).toBe(PROMPT_CATALOG_VERSION);
    expect(ctx.transitions).toEqual([]);
    expect(ctx.appVersion.length).toBeGreaterThan(0);
  });

  it('stamps heuristic providerId even when UI selection is a live vendor', () => {
    const ctx = buildResearchExecutionContext({
      snapshot: heuristicSnapshot,
      aiSettings: baseAi,
      executionId: 'h1',
      startedAt: 1,
    });
    expect(ctx.inferenceMode).toBe('heuristic');
    expect(ctx.inferenceReason).toBe('offline');
    expect(ctx.providerId).toBe('heuristic');
    expect(ctx.model).toBe('gpt-4o-mini');
  });

  it('resolves endpoint origin from approvedEndpointOrigin or customBaseUrl', () => {
    expect(
      resolveEndpointOrigin({
        ...baseAi,
        approvedEndpointOrigin: 'http://127.0.0.1:11434',
        customBaseUrl: 'http://localhost:11434/v1',
      }),
    ).toBe('http://127.0.0.1:11434');
    expect(
      resolveEndpointOrigin({
        ...baseAi,
        customBaseUrl: 'http://localhost:11434/v1',
      }),
    ).toBe('http://localhost:11434');
    expect(resolveEndpointOrigin({ ...baseAi, customBaseUrl: 'not-a-url' })).toBeUndefined();
  });

  it('includes endpointOrigin on the frozen context when configured', () => {
    const ctx = buildResearchExecutionContext({
      snapshot: liveSnapshot,
      aiSettings: {
        ...baseAi,
        provider: 'ollama',
        customBaseUrl: 'http://localhost:11434',
      },
      executionId: 'e2',
      startedAt: 2,
    });
    expect(ctx.endpointOrigin).toBe('http://localhost:11434');
  });
});
