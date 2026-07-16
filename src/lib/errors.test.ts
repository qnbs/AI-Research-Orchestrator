import { describe, it, expect } from 'vitest';
import { AppError, isAbortError, isAppError, toAppError } from './errors';

describe('AppError', () => {
  it('stores code and retryable flag', () => {
    const err = new AppError({
      code: 'NCBI_RATE_LIMIT',
      message: '429',
      retryable: true,
      status: 429,
      context: 'pubmed',
    });
    expect(err.code).toBe('NCBI_RATE_LIMIT');
    expect(err.retryable).toBe(true);
    expect(err.status).toBe(429);
    expect(isAppError(err)).toBe(true);
  });

  it('maps codes to user messages', () => {
    expect(new AppError({ code: 'NO_API_KEY', message: 'x' }).toUserMessage()).toMatch(/API key/i);
    expect(new AppError({ code: 'STREAM_ABORTED', message: 'x' }).toUserMessage()).toMatch(
      /cancelled/i,
    );
    expect(new AppError({ code: 'CIRCUIT_OPEN', message: 'x' }).toUserMessage()).toMatch(
      /circuit breaker/i,
    );
  });
});

describe('isAbortError / toAppError', () => {
  it('detects DOMException AbortError', () => {
    const abort = new DOMException('Aborted', 'AbortError');
    expect(isAbortError(abort)).toBe(true);
    const app = toAppError(abort, 'synthesis');
    expect(app.code).toBe('STREAM_ABORTED');
    expect(app.context).toBe('synthesis');
  });

  it('maps NO_API_KEY messages', () => {
    const app = toAppError(new Error('NO_API_KEY: missing'));
    expect(app.code).toBe('NO_API_KEY');
    expect(app.retryable).toBe(false);
  });

  it('maps rate limit and pubmed network errors', () => {
    expect(toAppError(new Error('429 rate limit')).code).toBe('GEMINI_RATE_LIMIT');
    expect(toAppError(new Error('Failed to fetch from PubMed: timeout')).code).toBe('NCBI_NETWORK');
    expect(toAppError(new Error('arxiv timeout')).code).toBe('ARXIV_NETWORK');
  });

  it('maps parse failures and quota', () => {
    expect(toAppError(new Error('JSON parse failed')).code).toBe('GEMINI_PARSE_FAILURE');
    expect(toAppError(new Error('quota exhausted')).code).toBe('GEMINI_QUOTA');
  });

  it('preserves existing AppError', () => {
    const original = new AppError({ code: 'VALIDATION', message: 'bad' });
    expect(toAppError(original)).toBe(original);
  });

  it('handles non-Error values', () => {
    const app = toAppError('boom');
    expect(app.code).toBe('UNKNOWN');
    expect(app.message).toBe('boom');
  });
});
