/**
 * Client-side logging with sensitive-value redaction (audit P1-5).
 * Use instead of raw console.error/warn in application code.
 */

import type { AppError } from './errors';

const SENSITIVE_KEY = /api[_-]?key|token|secret|password|authorization|encrypted|bearer/i;

const TEXT_PATTERNS: RegExp[] = [
  /\bAIza[0-9A-Za-z_-]{10,}\b/g,
  /\bsk-ant-[0-9A-Za-z_-]{10,}\b/g,
  /\bsk-[0-9A-Za-z_-]{10,}\b/g,
  /\bBearer\s+[A-Za-z0-9._-]+\b/gi,
];

/** Redact known secret patterns from free text. */
export function redactSensitiveText(text: string): string {
  let out = text;
  for (const pattern of TEXT_PATTERNS) {
    out = out.replace(pattern, '[REDACTED]');
  }
  return out;
}

/** Deep-redact objects before logging (keys, errors, nested payloads). */
export function redactSensitiveValue(value: unknown): unknown {
  if (value == null || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return redactSensitiveText(value);
  }

  if (value instanceof Error) {
    const app = value as AppError;
    return {
      name: value.name,
      message: redactSensitiveText(value.message),
      ...(app.code ? { code: app.code } : {}),
    };
  }

  if (Array.isArray(value)) {
    return value.map(redactSensitiveValue);
  }

  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY.test(key) ? '[REDACTED]' : redactSensitiveValue(nested);
    }
    return out;
  }

  return value;
}

export function safeLogError(message: string, ...args: unknown[]): void {
  console.error(message, ...args.map(redactSensitiveValue));
}

export function safeLogWarn(message: string, ...args: unknown[]): void {
  console.warn(message, ...args.map(redactSensitiveValue));
}
