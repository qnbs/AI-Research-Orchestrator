import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  estimateOllamaInputTokenBudget,
  getCachedOllamaHealth,
  invalidateOllamaHealthCache,
  isOllamaModelAvailable,
  mergeSignals,
  probeOllamaHealth,
} from './ollamaHealth';

describe('probeOllamaHealth', () => {
  beforeEach(() => {
    invalidateOllamaHealthCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    invalidateOllamaHealthCache();
  });

  it('returns version + models on success and caches by origin', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ version: '0.5.0' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [{ name: 'llama3.1:8b', size: 1, details: { parameter_size: '8B' } }],
        }),
      });

    const first = await probeOllamaHealth('http://localhost:11434/');
    expect(first.ok).toBe(true);
    if (first.ok) {
      expect(first.version).toBe('0.5.0');
      expect(first.models[0]?.name).toBe('llama3.1:8b');
      expect(first.models[0]?.parameterSize).toBe('8B');
    }
    expect(global.fetch).toHaveBeenCalledTimes(2);

    const cached = getCachedOllamaHealth('http://localhost:11434');
    expect(cached?.ok).toBe(true);

    const second = await probeOllamaHealth('http://localhost:11434');
    expect(second.ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('diagnoses CORS/network TypeError', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const result = await probeOllamaHealth('http://127.0.0.1:11434', { force: true });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('cors');
    }
  });

  it('rejects invalid endpoints without fetching', async () => {
    global.fetch = vi.fn();
    const result = await probeOllamaHealth('http://user:pass@localhost:11434');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('invalid_endpoint');
    }
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('surfaces HTTP failures from /api/version', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({ ok: false, status: 503 });
    const result = await probeOllamaHealth('http://localhost:11434', { force: true });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('http');
      expect(result.status).toBe(503);
    }
  });

  it('reports an aborted probe', async () => {
    const controller = new AbortController();
    global.fetch = vi.fn().mockImplementation(() => {
      controller.abort();
      return Promise.reject(new DOMException('Aborted', 'AbortError'));
    });
    const result = await probeOllamaHealth('http://localhost:11434', {
      force: true,
      signal: controller.signal,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('aborted');
    }
  });
});

describe('mergeSignals', () => {
  it('aborts when the external signal aborts even without AbortSignal.any', () => {
    const originalAny = AbortSignal.any;
    // @ts-expect-error -- simulate older runtimes lacking AbortSignal.any
    AbortSignal.any = undefined;
    try {
      const external = new AbortController();
      const merged = mergeSignals(60_000, external.signal);
      expect(merged.aborted).toBe(false);
      external.abort();
      expect(merged.aborted).toBe(true);
    } finally {
      AbortSignal.any = originalAny;
    }
  });
});

describe('isOllamaModelAvailable / estimateOllamaInputTokenBudget', () => {
  it('matches bare and tagged model names', () => {
    const models = [{ name: 'llama3.1:8b' }, { name: 'mistral' }];
    expect(isOllamaModelAvailable(models, 'llama3.1:8b')).toBe(true);
    expect(isOllamaModelAvailable(models, 'mistral:7b')).toBe(true);
    expect(isOllamaModelAvailable(models, 'missing')).toBe(false);
  });

  it('tightens budget and warns for small parameter sizes', () => {
    expect(estimateOllamaInputTokenBudget('tinyllama:1b').warnTooSmall).toBe(true);
    expect(estimateOllamaInputTokenBudget('llama3.1:8b').budget).toBe(8_000);
    expect(estimateOllamaInputTokenBudget('qwen2.5:14b').warnTooSmall).toBe(false);
    expect(estimateOllamaInputTokenBudget('qwen2.5:32b').budget).toBe(16_000);
  });
});
