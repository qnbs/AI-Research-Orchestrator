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

  it('maps remaining codes to distinct, non-empty user messages', () => {
    expect(new AppError({ code: 'GEMINI_QUOTA', message: 'x' }).toUserMessage()).toMatch(
      /quota/i,
    );
    expect(new AppError({ code: 'GEMINI_RATE_LIMIT', message: 'x' }).toUserMessage()).toMatch(
      /rate limit/i,
    );
    expect(new AppError({ code: 'GEMINI_PARSE_FAILURE', message: 'x' }).toUserMessage()).toMatch(
      /AI response/i,
    );
    expect(new AppError({ code: 'NCBI_RATE_LIMIT', message: 'x' }).toUserMessage()).toMatch(
      /PubMed\/NCBI rate limit/i,
    );
    expect(new AppError({ code: 'NCBI_NETWORK', message: 'x' }).toUserMessage()).toMatch(
      /PubMed is temporarily unavailable/i,
    );
    expect(new AppError({ code: 'ARXIV_NETWORK', message: 'x' }).toUserMessage()).toMatch(
      /arXiv is temporarily unavailable/i,
    );
    expect(new AppError({ code: 'STORAGE', message: 'x' }).toUserMessage()).toMatch(
      /local storage/i,
    );
    expect(new AppError({ code: 'UNKNOWN', message: 'x' }).toUserMessage()).toMatch(
      /unexpected error/i,
    );
  });

  it('VALIDATION user message echoes the original message', () => {
    expect(new AppError({ code: 'VALIDATION', message: 'Title is required' }).toUserMessage()).toBe(
      'Title is required',
    );
  });

  it('defaults retryable to false and exposes cause/context', () => {
    const cause = new Error('root cause');
    const err = new AppError({ code: 'STORAGE', message: 'db write failed', cause, context: 'kb' });
    expect(err.retryable).toBe(false);
    expect(err.cause).toBe(cause);
    expect(err.context).toBe('kb');
    expect(err.name).toBe('AppError');
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

  it('detects plain Error with AbortError name (non-DOMException)', () => {
    const abort = new Error('Aborted');
    abort.name = 'AbortError';
    expect(isAbortError(abort)).toBe(true);
    expect(toAppError(abort).code).toBe('STREAM_ABORTED');
  });

  it('isAbortError returns false for non-abort inputs', () => {
    expect(isAbortError(null)).toBe(false);
    expect(isAbortError(undefined)).toBe(false);
    expect(isAbortError('AbortError')).toBe(false);
    expect(isAbortError(new Error('plain'))).toBe(false);
  });

  it('maps NCBI rate limit when message mentions pubmed', () => {
    expect(toAppError(new Error('pubmed 429 rate limit exceeded')).code).toBe('NCBI_RATE_LIMIT');
  });

  it('routes rate limit to NCBI via context when message is generic', () => {
    const app = toAppError(new Error('429 too many requests'), 'pubmed');
    expect(app.code).toBe('NCBI_RATE_LIMIT');
    expect(app.status).toBe(429);
  });

  it('falls back to UNKNOWN for unrecognized error messages', () => {
    const app = toAppError(new Error('totally unrelated failure'), 'misc');
    expect(app.code).toBe('UNKNOWN');
    expect(app.retryable).toBe(false);
    expect(app.context).toBe('misc');
  });
});
