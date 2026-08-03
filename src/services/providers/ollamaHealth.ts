/**
 * Ollama health probe + model discovery with split TTL caches.
 *
 * Connectivity (`/api/version`) and model discovery (`/api/tags`) are cached
 * independently so degraded discovery recovers quickly without masking offline.
 */

import { AppError, isAbortError } from '../../lib/errors';
import { isOriginCspAllowed, validateCustomEndpointUrl } from '../../lib/endpointPolicy';
import { estimateOllamaInputTokenBudget } from '../../lib/ollamaContextBudget';

export { estimateOllamaInputTokenBudget };

export const OLLAMA_HEALTH_DEFAULT_TIMEOUT_MS = 15_000;
export const OLLAMA_CONNECTIVITY_CACHE_TTL_MS = 30_000;
export const OLLAMA_DISCOVERY_SUCCESS_TTL_MS = 30_000;
export const OLLAMA_DISCOVERY_FAILURE_TTL_MS = 5_000;

/** @deprecated Use OLLAMA_CONNECTIVITY_CACHE_TTL_MS — single-cache alias for legacy imports. */
export const OLLAMA_HEALTH_CACHE_TTL_MS = OLLAMA_CONNECTIVITY_CACHE_TTL_MS;

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
  /**
   * True when `/api/tags` returned a usable payload (including an empty model list).
   * False when connectivity succeeded but model discovery failed — callers must not
   * treat an empty `models` array as “model missing” in that case.
   */
  modelsDiscovered: boolean;
  checkedAt: number;
  connectivityCheckedAt: number;
  discoveryCheckedAt: number;
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

type ConnectivityCacheEntry = {
  version: string;
  checkedAt: number;
  expiresAt: number;
};

type DiscoveryCacheEntry = {
  models: OllamaModelInfo[];
  modelsDiscovered: boolean;
  checkedAt: number;
  expiresAt: number;
};

const connectivityCache = new Map<string, ConnectivityCacheEntry>();
const discoveryCache = new Map<string, DiscoveryCacheEntry>();

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

function readConnectivityCache(baseUrl: string): ConnectivityCacheEntry | undefined {
  const entry = connectivityCache.get(baseUrl);
  if (!entry || Date.now() > entry.expiresAt) {
    connectivityCache.delete(baseUrl);
    return undefined;
  }
  return entry;
}

function readDiscoveryCache(baseUrl: string): DiscoveryCacheEntry | undefined {
  const entry = discoveryCache.get(baseUrl);
  if (!entry || Date.now() > entry.expiresAt) {
    discoveryCache.delete(baseUrl);
    return undefined;
  }
  return entry;
}

function writeConnectivityCache(baseUrl: string, version: string): ConnectivityCacheEntry {
  const checkedAt = Date.now();
  const entry: ConnectivityCacheEntry = {
    version,
    checkedAt,
    expiresAt: checkedAt + OLLAMA_CONNECTIVITY_CACHE_TTL_MS,
  };
  connectivityCache.set(baseUrl, entry);
  return entry;
}

function writeDiscoveryCache(
  baseUrl: string,
  models: OllamaModelInfo[],
  modelsDiscovered: boolean,
): DiscoveryCacheEntry {
  const checkedAt = Date.now();
  const ttl = modelsDiscovered ? OLLAMA_DISCOVERY_SUCCESS_TTL_MS : OLLAMA_DISCOVERY_FAILURE_TTL_MS;
  const entry: DiscoveryCacheEntry = {
    models,
    modelsDiscovered,
    checkedAt,
    expiresAt: checkedAt + ttl,
  };
  const existing = discoveryCache.get(baseUrl);
  if (existing && existing.checkedAt > checkedAt) {
    return existing;
  }
  discoveryCache.set(baseUrl, entry);
  return entry;
}

function assembleHealthOk(
  origin: string,
  baseUrl: string,
  connectivity: ConnectivityCacheEntry,
  discovery: DiscoveryCacheEntry,
): OllamaHealthOk {
  return {
    ok: true,
    origin,
    baseUrl,
    version: connectivity.version,
    models: discovery.models,
    modelsDiscovered: discovery.modelsDiscovered,
    checkedAt: Math.max(connectivity.checkedAt, discovery.checkedAt),
    connectivityCheckedAt: connectivity.checkedAt,
    discoveryCheckedAt: discovery.checkedAt,
  };
}

function readErrorField(error: unknown, field: 'name' | 'message'): string {
  if (!error || typeof error !== 'object') return '';
  const value = (error as { name?: unknown; message?: unknown })[field];
  return typeof value === 'string' ? value : '';
}

function isTimeoutAbort(error: unknown): boolean {
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
  if (isTimeoutAbort(error)) {
    return { reason: 'timeout', message: 'Ollama health probe timed out' };
  }
  if (isAbortError(error)) {
    return { reason: 'aborted', message: 'Ollama health probe aborted' };
  }
  if (error instanceof TypeError) {
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
    connectivityCache.clear();
    discoveryCache.clear();
    return;
  }
  connectivityCache.delete(baseUrl);
  discoveryCache.delete(baseUrl);
}

/** Return a non-expired assembled probe result when connectivity + discovery caches are fresh. */
export function getCachedOllamaHealth(baseUrl: string): OllamaHealthResult | undefined {
  const connectivity = readConnectivityCache(baseUrl);
  const discovery = readDiscoveryCache(baseUrl);
  if (!connectivity || !discovery) return undefined;
  const normalized = normalizeBaseUrl(baseUrl);
  if (!normalized.ok) return undefined;
  return assembleHealthOk(normalized.origin, normalized.baseUrl, connectivity, discovery);
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

async function probeConnectivity(
  baseUrl: string,
  origin: string,
  signal: AbortSignal,
  checkedAt: number,
): Promise<OllamaHealthFail | ConnectivityCacheEntry> {
  const versionResponse = await fetch(`${baseUrl}/api/version`, { signal });
  if (!versionResponse.ok) {
    return {
      ok: false,
      origin,
      baseUrl,
      reason: 'http',
      message: `Ollama /api/version responded with ${versionResponse.status}`,
      status: versionResponse.status,
      checkedAt,
    };
  }
  const versionJson = (await versionResponse.json().catch(() => ({}))) as { version?: string };
  const version = typeof versionJson.version === 'string' ? versionJson.version : 'unknown';
  return writeConnectivityCache(baseUrl, version);
}

async function probeDiscovery(baseUrl: string, signal: AbortSignal): Promise<DiscoveryCacheEntry> {
  const models: OllamaModelInfo[] = [];
  let modelsDiscovered = false;
  try {
    const tagsResponse = await fetch(`${baseUrl}/api/tags`, { signal });
    if (tagsResponse.ok) {
      const tagsJson = (await tagsResponse.json().catch(() => null)) as TagsPayload | null;
      if (tagsJson && Array.isArray(tagsJson.models)) {
        modelsDiscovered = true;
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
      }
    }
  } catch (tagsError) {
    if (isTimeoutAbort(tagsError) || isAbortError(tagsError)) {
      throw tagsError;
    }
    modelsDiscovered = false;
  }
  return writeDiscoveryCache(baseUrl, models, modelsDiscovered);
}

/**
 * Probe Ollama `/api/version` + `/api/tags`.
 * Uses split TTL caches unless `force` is set.
 */
export async function probeOllamaHealth(
  rawBaseUrl?: string,
  options: { signal?: AbortSignal; timeoutMs?: number; force?: boolean } = {},
): Promise<OllamaHealthResult> {
  const normalized = normalizeBaseUrl(rawBaseUrl);
  if (!normalized.ok) return normalized;

  const { baseUrl, origin } = normalized;
  if (!isOriginCspAllowed(origin)) {
    return {
      ok: false,
      origin,
      baseUrl,
      reason: 'invalid_endpoint',
      message: `Origin ${origin} is not permitted by the application CSP`,
      checkedAt: Date.now(),
    };
  }

  if (!options.force) {
    const cached = getCachedOllamaHealth(baseUrl);
    if (cached) return cached;
  }

  const timeoutMs = options.timeoutMs ?? OLLAMA_HEALTH_DEFAULT_TIMEOUT_MS;
  const signal = mergeSignals(timeoutMs, options.signal);
  const checkedAt = Date.now();

  try {
    let connectivity: ConnectivityCacheEntry;
    if (!options.force && readConnectivityCache(baseUrl)) {
      connectivity = readConnectivityCache(baseUrl)!;
    } else {
      const versionResult = await probeConnectivity(baseUrl, origin, signal, checkedAt);
      if ('ok' in versionResult && versionResult.ok === false) {
        return versionResult;
      }
      connectivity = versionResult as ConnectivityCacheEntry;
    }

    let discovery: DiscoveryCacheEntry;
    if (!options.force && readDiscoveryCache(baseUrl)) {
      discovery = readDiscoveryCache(baseUrl)!;
    } else {
      discovery = await probeDiscovery(baseUrl, signal);
    }

    return assembleHealthOk(origin, baseUrl, connectivity, discovery);
  } catch (error) {
    const diagnosed = diagnoseFetchError(error);
    return {
      ok: false,
      origin,
      baseUrl,
      reason: diagnosed.reason,
      message: diagnosed.message,
      checkedAt,
    };
  }
}

/** Resolve a discovered model entry for a selected name (exact or tag alias). */
export function findOllamaModelInfo(
  models: OllamaModelInfo[],
  selectedModel: string,
): OllamaModelInfo | undefined {
  const target = selectedModel.trim().toLowerCase();
  if (!target) return undefined;
  const exact = models.find((m) => m.name.toLowerCase() === target);
  if (exact) return exact;
  return models.find((m) => {
    const name = m.name.toLowerCase();
    return name.startsWith(`${target}:`) || target.startsWith(`${name}:`);
  });
}

/** Whether a selected model name is present in a health probe model list. */
export function isOllamaModelAvailable(models: OllamaModelInfo[], selectedModel: string): boolean {
  return findOllamaModelInfo(models, selectedModel) !== undefined;
}

/**
 * Parameter-size hint for the active Ollama base URL only.
 * Never scans other cached endpoints (avoids cross-endpoint contamination).
 * Requires an explicit base URL string — omitted/undefined skips the cache.
 */
export function resolveCachedOllamaParameterSize(
  rawBaseUrl: string | undefined,
  model: string,
): string | undefined {
  if (typeof rawBaseUrl !== 'string') return undefined;
  const normalized = normalizeBaseUrl(rawBaseUrl);
  if (!normalized.ok) return undefined;
  const cached = getCachedOllamaHealth(normalized.baseUrl);
  if (!cached?.ok || !cached.modelsDiscovered) return undefined;
  return findOllamaModelInfo(cached.models, model)?.parameterSize;
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
