import { describe, it, expect } from 'vitest';
import {
  validateCustomEndpointUrl,
  isOriginCspAllowed,
  resolveApprovedBaseUrl,
} from './endpointPolicy';

describe('validateCustomEndpointUrl', () => {
  it('accepts a valid HTTPS OpenAI endpoint', () => {
    const result = validateCustomEndpointUrl('https://api.openai.com/v1');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.origin).toBe('https://api.openai.com');
    }
  });

  it('rejects credentials embedded in the URL', () => {
    const result = validateCustomEndpointUrl('https://user:pass@api.openai.com/v1');
    expect(result.ok).toBe(false);
  });

  it('rejects insecure remote HTTP', () => {
    const result = validateCustomEndpointUrl('http://evil.example/v1');
    expect(result.ok).toBe(false);
  });

  it('allows loopback HTTP for Ollama', () => {
    const result = validateCustomEndpointUrl('http://localhost:11434');
    expect(result.ok).toBe(true);
  });
});

describe('resolveApprovedBaseUrl', () => {
  it('throws when origin is not CSP-permitted', () => {
    expect(() =>
      resolveApprovedBaseUrl('https://custom.example/v1', 'https://custom.example'),
    ).toThrow(/CSP/);
  });

  it('returns normalized URL when approved and CSP-permitted', () => {
    expect(resolveApprovedBaseUrl('https://api.openai.com/v1/', 'https://api.openai.com')).toBe(
      'https://api.openai.com/v1',
    );
  });

  it('throws when endpoint changed since approval', () => {
    expect(() =>
      resolveApprovedBaseUrl('https://openrouter.ai/api/v1', 'https://api.openai.com'),
    ).toThrow(/changed since approval/);
  });
});

describe('isOriginCspAllowed', () => {
  it('includes official provider origins', () => {
    expect(isOriginCspAllowed('https://api.anthropic.com')).toBe(true);
  });
});
