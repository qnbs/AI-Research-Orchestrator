import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AppError } from './errors';
import { redactSensitiveText, redactSensitiveValue, safeLogError, safeLogWarn } from './safeLog';

describe('redactSensitiveText', () => {
  it('redacts Gemini, OpenAI, Anthropic, and Bearer patterns', () => {
    const text =
      'key=AIzaSyDUMMYKEY1234567890 sk-abcdefghijklmnopqrstuvwxyz sk-ant-abcdefghijklmnopqrstuvwxyz Bearer eyJhbGciOiJIUzI1NiJ9';
    const redacted = redactSensitiveText(text);
    expect(redacted).not.toContain('AIzaSy');
    expect(redacted).not.toContain('sk-abcdef');
    expect(redacted).not.toContain('sk-ant-');
    expect(redacted).not.toContain('Bearer eyJ');
    expect(redacted).toContain('[REDACTED]');
  });

  it('returns plain text unchanged when no secrets match', () => {
    expect(redactSensitiveText('cancer research query')).toBe('cancer research query');
  });
});

describe('redactSensitiveValue', () => {
  it('passes through null, numbers, and booleans', () => {
    expect(redactSensitiveValue(null)).toBeNull();
    expect(redactSensitiveValue(42)).toBe(42);
    expect(redactSensitiveValue(true)).toBe(true);
  });

  it('redacts sensitive object keys and error messages', () => {
    const err = new Error('Auth failed for sk-ant-abcdefghijklmnopqrstuvwxyz');
    const payload = {
      apiKey: 'secret-value',
      topic: 'cancer research',
      nested: { authorization: 'Bearer abc.def.ghi' },
    };
    const redacted = redactSensitiveValue({ err, payload }) as {
      err: { message: string };
      payload: { apiKey: string; topic: string; nested: { authorization: string } };
    };
    expect(redacted.payload.apiKey).toBe('[REDACTED]');
    expect(redacted.payload.topic).toBe('cancer research');
    expect(redacted.payload.nested.authorization).toBe('[REDACTED]');
    expect(redacted.err.message).toContain('[REDACTED]');
  });

  it('includes AppError code when present', () => {
    const err = new AppError({ code: 'NO_API_KEY', message: 'sk-abcdefghijklmnopqrstuvwxyz' });
    const redacted = redactSensitiveValue(err) as { name: string; message: string; code: string };
    expect(redacted.code).toBe('NO_API_KEY');
    expect(redacted.message).toContain('[REDACTED]');
  });

  it('redacts arrays recursively', () => {
    const redacted = redactSensitiveValue(['plain', { token: 'abc123' }]) as unknown[];
    expect(redacted[0]).toBe('plain');
    expect((redacted[1] as { token: string }).token).toBe('[REDACTED]');
  });

  it('returns unknown primitive types unchanged', () => {
    const fn = () => undefined;
    expect(redactSensitiveValue(fn)).toBe(fn);
  });
});

describe('safeLogError / safeLogWarn', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs redacted values via console.error', () => {
    safeLogError('operation failed', { apiKey: 'secret' });
    expect(console.error).toHaveBeenCalledWith('operation failed', { apiKey: '[REDACTED]' });
  });

  it('logs redacted values via console.warn', () => {
    safeLogWarn('retrying', 'sk-abcdefghijklmnopqrstuvwxyz');
    expect(console.warn).toHaveBeenCalledWith('retrying', '[REDACTED]');
  });
});
