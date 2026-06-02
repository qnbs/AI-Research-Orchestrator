import { describe, it, expect } from 'vitest';
import { getResponseFromGeminiError, getStatusFromGeminiError } from './geminiErrorTypes';

describe('geminiErrorTypes', () => {
  it('extracts response and status when present', () => {
    const err = {
      response: { candidates: [{ finishReason: 'STOP' }] },
      status: 429,
    };
    expect(getResponseFromGeminiError(err)).toEqual(err.response);
    expect(getStatusFromGeminiError(err)).toBe(429);
  });

  it('returns undefined when fields are missing', () => {
    expect(getResponseFromGeminiError({ message: 'fail' })).toBeUndefined();
    expect(getStatusFromGeminiError({ message: 'fail' })).toBeUndefined();
  });
});
