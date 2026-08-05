/**
 * Ollama `/api/show` model metadata — context length and parameter hints.
 * Context window drives prompt budgets; parameter size is a quality hint only.
 */

import { isAbortError } from './errors';
import { validateCustomEndpointUrl } from './endpointPolicy';

export const OLLAMA_MODEL_METADATA_CACHE_TTL_MS = 300_000;
export const OLLAMA_MODEL_METADATA_FAILURE_TTL_MS = 30_000;
export const OLLAMA_MODEL_METADATA_DEFAULT_TIMEOUT_MS = 15_000;

export type OllamaModelMetadata = {
  model: string;
  baseUrl: string;
  contextLength?: number;
  parameterSize?: string;
  checkedAt: number;
  source: 'model_info' | 'parameters' | 'tags-fallback' | 'unknown';
};

type CacheEntry = { metadata: OllamaModelMetadata; expiresAt: number };

const metadataCache = new Map<string, CacheEntry>();

function cacheKey(baseUrl: string, model: string): string {
  return `${baseUrl}::${model.trim().toLowerCase()}`;
}

// Optional so every caller shares the same undefined -> localhost default, rather than
// each call site pre-resolving it differently (a prior divergence between probe and
// cache-lookup calls meant a probe run with no explicit baseUrl cached its result under
// the normalized localhost key, but a lookup with no explicit baseUrl short-circuited to
// undefined before ever normalizing, so it could never hit that cache entry).
function normalizeBaseUrl(raw?: string): string | undefined {
  const candidate = (raw ?? '').trim().replace(/\/$/, '') || 'http://localhost:11434';
  const validated = validateCustomEndpointUrl(candidate);
  return validated.ok ? validated.normalizedUrl : undefined;
}

function parseContextFromModelInfo(modelInfo: Record<string, unknown>): number | undefined {
  let best: number | undefined;
  for (const [key, value] of Object.entries(modelInfo)) {
    if (!/context_length/i.test(key)) continue;
    const n = typeof value === 'number' ? value : Number(value);
    if (Number.isFinite(n) && n > 0) {
      best = best === undefined ? n : Math.max(best, n);
    }
  }
  return best;
}

function parseContextFromParameters(parameters: string): number | undefined {
  const match = parameters.match(/num_ctx\s+(\d+)/i);
  if (!match) return undefined;
  const n = Number(match[1]);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

type ShowPayload = {
  details?: { parameter_size?: string };
  model_info?: Record<string, unknown>;
  parameters?: string;
};

/** Clear cached model metadata for one endpoint/model pair, or entire cache. */
export function invalidateOllamaModelMetadataCache(baseUrl?: string, model?: string): void {
  if (!baseUrl) {
    metadataCache.clear();
    return;
  }
  const normalized = normalizeBaseUrl(baseUrl);
  if (!normalized) return;
  if (!model) {
    for (const key of metadataCache.keys()) {
      if (key.startsWith(`${normalized}::`)) metadataCache.delete(key);
    }
    return;
  }
  metadataCache.delete(cacheKey(normalized, model));
}

/** Return cached metadata when fresh. */
export function getCachedOllamaModelMetadata(
  rawBaseUrl: string | undefined,
  model: string,
): OllamaModelMetadata | undefined {
  const baseUrl = normalizeBaseUrl(rawBaseUrl);
  if (!baseUrl || !model.trim()) return undefined;
  const entry = metadataCache.get(cacheKey(baseUrl, model));
  if (!entry || Date.now() > entry.expiresAt) {
    metadataCache.delete(cacheKey(baseUrl, model));
    return undefined;
  }
  return entry.metadata;
}

function rememberMetadata(metadata: OllamaModelMetadata, success: boolean): OllamaModelMetadata {
  const ttl = success ? OLLAMA_MODEL_METADATA_CACHE_TTL_MS : OLLAMA_MODEL_METADATA_FAILURE_TTL_MS;
  metadataCache.set(cacheKey(metadata.baseUrl, metadata.model), {
    metadata,
    expiresAt: Date.now() + ttl,
  });
  return metadata;
}

/**
 * Probe Ollama `/api/show` for runtime context capacity.
 * Falls back to unknown when the endpoint or model is unavailable.
 */
export async function probeOllamaModelMetadata(
  rawBaseUrl: string | undefined,
  model: string,
  options: { signal?: AbortSignal; timeoutMs?: number; force?: boolean } = {},
): Promise<OllamaModelMetadata | undefined> {
  const baseUrl = normalizeBaseUrl(rawBaseUrl);
  const trimmedModel = model.trim();
  if (!baseUrl || !trimmedModel) return undefined;

  if (!options.force) {
    const cached = getCachedOllamaModelMetadata(baseUrl, trimmedModel);
    if (cached) return cached;
  }

  const timeoutMs = options.timeoutMs ?? OLLAMA_MODEL_METADATA_DEFAULT_TIMEOUT_MS;
  const signal = options.signal ?? AbortSignal.timeout(timeoutMs);
  const checkedAt = Date.now();

  try {
    const response = await fetch(`${baseUrl}/api/show`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmedModel }),
      signal,
    });

    if (!response.ok) {
      return rememberMetadata(
        {
          model: trimmedModel,
          baseUrl,
          checkedAt,
          source: 'unknown',
        },
        false,
      );
    }

    const payload = (await response.json().catch(() => null)) as ShowPayload | null;
    let contextLength: number | undefined;
    let source: OllamaModelMetadata['source'] = 'unknown';

    if (payload?.model_info && typeof payload.model_info === 'object') {
      const fromInfo = parseContextFromModelInfo(payload.model_info);
      if (fromInfo !== undefined) {
        contextLength = fromInfo;
        source = 'model_info';
      }
    }
    if (contextLength === undefined && typeof payload?.parameters === 'string') {
      const fromParams = parseContextFromParameters(payload.parameters);
      if (fromParams !== undefined) {
        contextLength = fromParams;
        source = 'parameters';
      }
    }

    const parameterSize =
      typeof payload?.details?.parameter_size === 'string'
        ? payload.details.parameter_size
        : undefined;

    return rememberMetadata(
      {
        model: trimmedModel,
        baseUrl,
        contextLength,
        parameterSize,
        checkedAt,
        source,
      },
      true,
    );
  } catch (error) {
    if (isAbortError(error)) throw error;
    return rememberMetadata(
      {
        model: trimmedModel,
        baseUrl,
        checkedAt,
        source: 'unknown',
      },
      false,
    );
  }
}

/** Cached context length for prompt budgeting (undefined when unknown). */
export function resolveCachedOllamaContextLength(
  rawBaseUrl: string | undefined,
  model: string,
): number | undefined {
  const meta = getCachedOllamaModelMetadata(rawBaseUrl, model);
  return meta?.contextLength;
}
