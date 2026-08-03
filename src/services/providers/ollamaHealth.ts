/**
 * Ollama health probe + model discovery with a short TTL cache.
 *
 * Probes `/api/version` then `/api/tags`. Distinguishes CORS, timeout,
 * abort, HTTP, and generic unavailability for Settings diagnostics.
 */

import { AppError, isAbortError } from '../../lib/errors';
import { validateCustomEndpointUrl } from '../../lib/endpointPolicy';
import { estimateOllamaInputTokenBudget } from '../../lib/ollamaContextBudget';

export { estimateOllamaInputTokenBudget };

export const OLLAMA_HEALTH_DEFAULT_TIMEOUT_MS = 15_000;
export const OLLAMA_HEALTH_CACHE_TTL_MS = 30_000;

export type OllamaHealthFailureReason =
  'invalid_endpoint' | 'unavailable' | 'cors' | 'timeout' | 'aborted' | 'http' | 'model_list';

export type OllamaModelInfo = {
  name: string;
  size?: number;
  modifiedAt?: string;
  /** Parameter size hint from tags metadata when present (e.g. "8B"). */
  parameterSize?: string;
};

export type OllamaHealthOk = {
  ok: true;
  origin: string;
  baseUrl: string;
  version: string;
  models: OllamaModelInfo[];
  checkedAt: number;
};

export type OllamaHealthFail = {
  ok: false;
  origin?: string;
  baseUrl?: string;
  reason: OllamaHealthFailureReason;
  message: string;
  status?: number;
  checkedAt: number;
};

export type OllamaHealthResult = OllamaHealthOk | OllamaHealthFail;

type CacheEntry = { result: OllamaHealthResult; expiresAt: number };

const healthCache = new Map<string, CacheEntry>();

function normalizeBaseUrl(
  raw?: string,
): { ok: true; baseUrl: string; origin: string } | OllamaHealthFail {
  const candidate = (raw?.trim() || 'http://localhost:11434').replace(/\/$/, '');
  const validated = validateCustomEndpointUrl(candidate);
  if (!validated.ok) {
    return {
      ok: false,
      reason: 'invalid_endpoint',
      message: validated.reason,
      checkedAt: Date.now(),
    };
  }
  return { ok: true, baseUrl: validated.normalizedUrl, origin: validated.origin };
}

function readErrorField(error: unknown, field: 'name' | 'message'): string {
  if (!error || typeof error !== 'object') return '';
  const value = (error as { name?: unknown; message?: unknown })[field];
  return typeof value === 'string' ? value : '';
}

function isTimeoutAbort(error: unknown): boolean {
  // DOMException may not be `instanceof Error` under jsdom — read fields duck-typed.
  const name = readErrorField(error, 'name');
  const message = readErrorField(error, 'message');
  if (name === 'TimeoutError') return true;
  if (/timed?\s*out|timeout/i.test(message)) return true;
  const cause =
    error && typeof error === 'object' && 'cause' in error
      ? (error as { cause?: unknown }).cause
      : undefined;
  if (cause) {
    if (readErrorField(cause, 'name') === 'TimeoutError') return true;
    if (/timed?\s*out|timeout/i.test(readErrorField(cause, 'message'))) return true;
  }
  return false;
}

function diagnoseFetchError(error: unknown): Pick<OllamaHealthFail, 'reason' | 'message'> {
  // TimeoutError is not always classified as AbortError (see isAbortLikeError).
  if (isTimeoutAbort(error)) {
    return { reason: 'timeout', message: 'Ollama health probe timed out' };
  }
  if (isAbortError(error)) {
    return { reason: 'aborted', message: 'Ollama health probe aborted' };
  }
  if (error instanceof TypeError) {
    // Browsers surface CORS / failed fetch as TypeError("Failed to fetch").
    return {
      reason: 'cors',
      message:
        'Could not reach Ollama (network or CORS). Ensure the server allows browser origins and is running.',
    };
  }
  if (error instanceof Error) {
    return { reason: 'unavailable', message: error.message };
  }
  return { reason: 'unavailable', message: 'Ollama server is unavailable' };
}

/** Combine timeout + optional external signal; always enforce timeoutMs. */
export function mergeSignals(timeoutMs: number, external?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  if (!external) return timeout;
  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any([timeout, external]);
  }

  const controller = new AbortController();
  const abortAsTimeout = () => {
    if (!controller.signal.aborted) {
      controller.abort(new DOMException('Ollama health probe timed out', 'TimeoutError'));
    }
  };
  const abortAsExternal = () => {
    if (!controller.signal.aborted) {
      controller.abort(external.reason);
    }
  };
  if (timeout.aborted) {
    abortAsTimeout();
    return controller.signal;
  }
  if (external.aborted) {
    abortAsExternal();
    return controller.signal;
  }
  timeout.addEventListener('abort', abortAsTimeout, { once: true });
  external.addEventListener('abort', abortAsExternal, { once: true });
  return controller.signal;
}

/** Clear cached health for one base URL, or the entire cache when omitted. */
export function invalidateOllamaHealthCache(baseUrl?: string): void {
  if (!baseUrl) {
    healthCache.clear();
    return;
  }
  healthCache.delete(baseUrl);
}

/** Return a non-expired cached probe result when available (keyed by full base URL). */
export function getCachedOllamaHealth(baseUrl: string): OllamaHealthResult | undefined {
  const entry = healthCache.get(baseUrl);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    healthCache.delete(baseUrl);
    return undefined;
  }
  return entry.result;
}

function remember(result: OllamaHealthResult): OllamaHealthResult {
  if (result.baseUrl) {
    healthCache.set(result.baseUrl, {
      result,
      expiresAt: Date.now() + OLLAMA_HEALTH_CACHE_TTL_MS,
    });
  }
  return result;
}

type TagsPayload = {
  models?: Array<{
    name?: string;
    model?: string;
    size?: number;
    modified_at?: string;
    details?: { parameter_size?: string };
  }>;
};

/**
 * Probe Ollama `/api/version` + `/api/tags`.
 * Uses the TTL cache unless `force` is set.
 */
export async function probeOllamaHealth(
  rawBaseUrl?: string,
  options: { signal?: AbortSignal; timeoutMs?: number; force?: boolean } = {},
): Promise<OllamaHealthResult> {
  const normalized = normalizeBaseUrl(rawBaseUrl);
  if (!normalized.ok) return normalized;

  const { baseUrl, origin } = normalized;
  if (!options.force) {
    const cached = getCachedOllamaHealth(baseUrl);
    if (cached) return cached;
  }

  const timeoutMs = options.timeoutMs ?? OLLAMA_HEALTH_DEFAULT_TIMEOUT_MS;
  const signal = mergeSignals(timeoutMs, options.signal);
  const checkedAt = Date.now();

  try {
    const versionResponse = await fetch(`${baseUrl}/api/version`, { signal });
    if (!versionResponse.ok) {
      return remember({
        ok: false,
        origin,
        baseUrl,
        reason: 'http',
        message: `Ollama /api/version responded with ${versionResponse.status}`,
        status: versionResponse.status,
        checkedAt,
      });
    }
    const versionJson = (await versionResponse.json().catch(() => ({}))) as { version?: string };
    const version = typeof versionJson.version === 'string' ? versionJson.version : 'unknown';

    const tagsResponse = await fetch(`${baseUrl}/api/tags`, { signal });
    if (!tagsResponse.ok) {
      return remember({
        ok: false,
        origin,
        baseUrl,
        reason: 'model_list',
        message: `Ollama /api/tags responded with ${tagsResponse.status}`,
        status: tagsResponse.status,
        checkedAt,
      });
    }

    const tagsJson = (await tagsResponse.json().catch(() => null)) as TagsPayload | null;
    if (!tagsJson || !Array.isArray(tagsJson.models)) {
      return remember({
        ok: false,
        origin,
        baseUrl,
        reason: 'model_list',
        message: 'Ollama /api/tags returned an unexpected payload',
        checkedAt,
      });
    }

    const models: OllamaModelInfo[] = [];
    for (const m of tagsJson.models) {
      const name = (m.name ?? m.model ?? '').trim();
      if (!name) continue;
      const info: OllamaModelInfo = { name };
      if (typeof m.size === 'number') info.size = m.size;
      if (typeof m.modified_at === 'string') info.modifiedAt = m.modified_at;
      if (typeof m.details?.parameter_size === 'string') {
        info.parameterSize = m.details.parameter_size;
      }
      models.push(info);
    }

    return remember({
      ok: true,
      origin,
      baseUrl,
      version,
      models,
      checkedAt,
    });
  } catch (error) {
    const diagnosed = diagnoseFetchError(error);
    const fail: OllamaHealthFail = {
      ok: false,
      origin,
      baseUrl,
      reason: diagnosed.reason,
      message: diagnosed.message,
      checkedAt,
    };
    // Do not cache aborted/timeout probes — they are often supersession artifacts.
    if (diagnosed.reason === 'aborted' || diagnosed.reason === 'timeout') {
      return fail;
    }
    return remember(fail);
  }
}

/** Whether a selected model name is present in a health probe model list. */
export function isOllamaModelAvailable(models: OllamaModelInfo[], selectedModel: string): boolean {
  const target = selectedModel.trim().toLowerCase();
  if (!target) return false;
  return models.some((m) => {
    const name = m.name.toLowerCase();
    return name === target || name.startsWith(`${target}:`) || target.startsWith(`${name}:`);
  });
}

/** Map a failed health probe into a typed AppError for provider callers. */
export function ollamaHealthToAppError(result: OllamaHealthFail): AppError {
  return new AppError({
    code: result.reason === 'aborted' ? 'STREAM_ABORTED' : 'PROVIDER_UNAVAILABLE',
    message: result.message,
    retryable: result.reason === 'timeout' || result.reason === 'unavailable',
    status: result.status,
    context: `ollama_health:${result.reason}`,
  });
}
