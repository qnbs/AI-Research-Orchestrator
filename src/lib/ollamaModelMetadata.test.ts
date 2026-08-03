import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getCachedOllamaModelMetadata,
  invalidateOllamaModelMetadataCache,
  probeOllamaModelMetadata,
  resolveCachedOllamaContextLength,
} from './ollamaModelMetadata';

describe('probeOllamaModelMetadata', () => {
  beforeEach(() => {
    invalidateOllamaModelMetadataCache();
    vi.restoreAllMocks();
  });

  it('parses context length from model_info', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        model_info: { 'llama.context_length': 8192 },
        details: { parameter_size: '8B' },
      }),
    });

    const meta = await probeOllamaModelMetadata('http://localhost:11434', 'llama3.1:8b', {
      force: true,
    });
    expect(meta?.contextLength).toBe(8192);
    expect(meta?.parameterSize).toBe('8B');
    expect(meta?.source).toBe('model_info');
    expect(resolveCachedOllamaContextLength('http://localhost:11434', 'llama3.1:8b')).toBe(8192);
  });

  it('falls back to num_ctx in parameters string', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        parameters: 'num_ctx 16384\nnum_predict 512',
      }),
    });

    const meta = await probeOllamaModelMetadata('http://localhost:11434', 'custom', {
      force: true,
    });
    expect(meta?.contextLength).toBe(16_384);
    expect(meta?.source).toBe('parameters');
  });

  it('caches successful probes', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ model_info: { context_length: 4096 } }),
    });
    await probeOllamaModelMetadata('http://localhost:11434', 'm1', { force: true });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(getCachedOllamaModelMetadata('http://localhost:11434', 'm1')?.contextLength).toBe(4096);
    await probeOllamaModelMetadata('http://localhost:11434', 'm1');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
