import { describe, expect, it, vi } from 'vitest';

vi.mock('./apiKeyService', () => ({
  hasProviderApiKey: vi.fn(),
}));

import { hasProviderApiKey } from './apiKeyService';
import { resolveActiveInferenceMode } from './resolveActiveInferenceMode';

describe('resolveActiveInferenceMode', () => {
  it('uses injected getOnline and checkApiKey', async () => {
    const snap = await resolveActiveInferenceMode({
      forceHeuristic: false,
      provider: 'openai',
      getOnline: () => false,
      checkApiKey: async () => true,
    });

    expect(snap.mode).toBe('heuristic');
    expect(snap.reason).toBe('offline');
    expect(snap.provider).toBe('openai');
  });

  it('does not call hasProviderApiKey for heuristic provider slot', async () => {
    const snap = await resolveActiveInferenceMode({
      forceHeuristic: false,
      provider: 'heuristic',
    });

    expect(hasProviderApiKey).not.toHaveBeenCalled();
    expect(snap.mode).toBe('heuristic');
    expect(snap.reason).toBe('force');
  });

  it('defaults provider to gemini when omitted', async () => {
    const snap = await resolveActiveInferenceMode({
      forceHeuristic: false,
      checkApiKey: async () => true,
      getOnline: () => true,
    });

    expect(snap.provider).toBe('gemini');
    expect(snap.mode).toBe('live');
  });
});
