import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  estimateOllamaInputTokenBudget,
  getCachedOllamaHealth,
  invalidateOllamaHealthCache,
  isOllamaModelAvailable,
  mergeSignals,
  probeOllamaHealth,
  resolveCachedOllamaParameterSize,
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
      expect(first.modelsDiscovered).toBe(true);
      expect(first.models[0]?.name).toBe('llama3.1:8b');
      expect(first.models[0]?.parameterSize).toBe('8B');
    }
    expect(global.fetch).toHaveBeenCalledTimes(2);

    const cached = getCachedOllamaHealth('http://localhost:11434');
    expect(cached?.ok).toBe(true);

    const second = await probeOllamaHealth('http://localhost:11434');
    expect(second.ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(2);

    // Different path on the same origin must not reuse the previous cache entry.
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ version: '0.5.1' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ models: [] }) });
    const otherPath = await probeOllamaHealth('http://localhost:11434/v1');
    expect(otherPath.ok).toBe(true);
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

  it('treats version success as connected even when tags fail', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ version: '0.5.0' }) })
      .mockResolvedValueOnce({ ok: false, status: 500 });
    const result = await probeOllamaHealth('http://localhost:11434', { force: true });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.models).toEqual([]);
      expect(result.modelsDiscovered).toBe(false);
    }
  });

  it('keeps connectivity when tags fetch throws a network error', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ version: '0.5.0' }) })
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const result = await probeOllamaHealth('http://localhost:11434', { force: true });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.version).toBe('0.5.0');
      expect(result.modelsDiscovered).toBe(false);
    }
  });

  it('marks empty tags payload as discovered (no false model-missing)', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ version: '0.5.0' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ models: [] }) });
    const result = await probeOllamaHealth('http://localhost:11434', { force: true });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.modelsDiscovered).toBe(true);
      expect(result.models).toEqual([]);
    }
  });

  it('does not cache failed probes', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({ ok: false, status: 503 });
    await probeOllamaHealth('http://localhost:11434', { force: true });
    expect(getCachedOllamaHealth('http://localhost:11434')).toBeUndefined();
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

  it('aborts on timeout without AbortSignal.any', async () => {
    const originalAny = AbortSignal.any;
    // @ts-expect-error -- simulate older runtimes lacking AbortSignal.any
    AbortSignal.any = undefined;
    try {
      const external = new AbortController();
      const merged = mergeSignals(20, external.signal);
      expect(merged.aborted).toBe(false);
      await new Promise((r) => setTimeout(r, 40));
      expect(merged.aborted).toBe(true);
      expect((merged.reason as { name?: string } | undefined)?.name).toBe('TimeoutError');
    } finally {
      AbortSignal.any = originalAny;
    }
  });
});

describe('diagnoseFetchError timeout classification', () => {
  it('classifies timeout abort messages as timeout', async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValueOnce(
        new DOMException('The operation was aborted due to timeout', 'AbortError'),
      );
    const result = await probeOllamaHealth('http://localhost:11434', { force: true });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('timeout');
    }
  });

  it('classifies TimeoutError name as timeout', async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValueOnce(new DOMException('Ollama health probe timed out', 'TimeoutError'));
    const result = await probeOllamaHealth('http://localhost:11434', { force: true });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('timeout');
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

  it('resolves parameterSize only from the active endpoint cache', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ version: '0.5.0' }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [{ name: 'custom-local', details: { parameter_size: '1B' } }],
        }),
      });
    await probeOllamaHealth('http://localhost:11434', { force: true });
    expect(resolveCachedOllamaParameterSize('http://localhost:11434', 'custom-local')).toBe('1B');
    expect(resolveCachedOllamaParameterSize('http://127.0.0.1:11434', 'custom-local')).toBe(
      undefined,
    );
  });

  it('tightens budget and warns for small parameter sizes', () => {
    expect(estimateOllamaInputTokenBudget('tinyllama:1b').warnTooSmall).toBe(true);
    expect(estimateOllamaInputTokenBudget('tinyllama:1b').budget).toBeGreaterThanOrEqual(6_000);
    expect(estimateOllamaInputTokenBudget('llama3.1:8b').budget).toBe(8_000);
    expect(estimateOllamaInputTokenBudget('qwen2.5:14b').warnTooSmall).toBe(false);
    expect(estimateOllamaInputTokenBudget('qwen2.5:32b').budget).toBe(16_000);
    expect(estimateOllamaInputTokenBudget('mixtral:8x7b').budget).toBe(16_000);
  });
});
