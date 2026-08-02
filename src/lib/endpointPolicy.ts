/**
 * Custom AI provider endpoint trust policy.
 * Aligns UI validation, provider requests, and CSP allowlist expectations.
 */

/** Origins permitted by index.html connect-src (without path). */
export const CSP_ALLOWED_ORIGINS = new Set([
  'https://generativelanguage.googleapis.com',
  'https://eutils.ncbi.nlm.nih.gov',
  'https://export.arxiv.org',
  'https://api.openai.com',
  'https://openrouter.ai',
  'https://api.anthropic.com',
  'http://localhost:11434',
]);

export type EndpointValidationResult =
  { ok: true; origin: string; normalizedUrl: string } | { ok: false; reason: string };

/** Parse and validate a custom provider base URL. */
export function validateCustomEndpointUrl(raw: string): EndpointValidationResult {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { ok: false, reason: 'URL is required' };
  }

  for (let i = 0; i < trimmed.length; i++) {
    const code = trimmed.charCodeAt(i);
    if (code <= 32 || code === 127) {
      return { ok: false, reason: 'URL contains whitespace or control characters' };
    }
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, reason: 'URL is not valid' };
  }

  if (parsed.username || parsed.password) {
    return { ok: false, reason: 'Credentials must not be embedded in the URL' };
  }

  if (parsed.hash) {
    return { ok: false, reason: 'URL fragments are not allowed' };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { ok: false, reason: 'Only HTTP(S) endpoints are supported' };
  }

  const isLoopback =
    parsed.hostname === 'localhost' ||
    parsed.hostname === '127.0.0.1' ||
    parsed.hostname === '[::1]';

  if (parsed.protocol === 'http:' && !isLoopback) {
    return { ok: false, reason: 'Insecure HTTP is only allowed for loopback hosts' };
  }

  const origin = parsed.origin;
  const normalizedUrl = `${origin}${parsed.pathname.replace(/\/$/, '') || ''}`;

  return { ok: true, origin, normalizedUrl };
}

/** Whether the origin is on the static CSP connect-src allowlist. */
export function isOriginCspAllowed(origin: string): boolean {
  return CSP_ALLOWED_ORIGINS.has(origin);
}

/**
 * Resolve the effective base URL for a provider request.
 * Throws when validation fails or the origin is not CSP-permitted.
 */
export function resolveApprovedBaseUrl(
  raw: string | undefined,
  approvedOrigin: string | undefined,
): string | undefined {
  if (!raw?.trim()) return undefined;

  const result = validateCustomEndpointUrl(raw);
  if (!result.ok) {
    throw new Error(result.reason);
  }

  if (!approvedOrigin || approvedOrigin !== result.origin) {
    throw new Error(
      'Custom endpoint not approved. Confirm the destination in Settings before connecting.',
    );
  }

  if (!isOriginCspAllowed(result.origin)) {
    throw new Error(
      `Endpoint origin ${result.origin} is not permitted by the application CSP. ` +
        'Use a listed provider preset, localhost Ollama, or self-host with a tailored CSP.',
    );
  }

  return result.normalizedUrl;
}
