import { describe, it, expect } from 'vitest';
import { redactSensitiveText, redactSensitiveValue } from './safeLog';

describe('redactSensitiveText', () => {
  it('redacts Gemini and OpenAI key patterns', () => {
    const text = 'key=AIzaSyDUMMYKEY1234567890 and sk-abcdefghijklmnopqrstuvwxyz';
    expect(redactSensitiveText(text)).not.toContain('AIzaSy');
    expect(redactSensitiveText(text)).not.toContain('sk-abcdef');
    expect(redactSensitiveText(text)).toContain('[REDACTED]');
  });
});

describe('redactSensitiveValue', () => {
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
});
