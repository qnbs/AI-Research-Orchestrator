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

  it('allows 127.0.0.1 and IPv6 loopback for Ollama', () => {
    expect(validateCustomEndpointUrl('http://127.0.0.1:11434').ok).toBe(true);
    const ipv6 = validateCustomEndpointUrl('http://[::1]:11434');
    expect(ipv6.ok).toBe(true);
    if (ipv6.ok) {
      expect(ipv6.origin).toBe('http://[::1]:11434');
    }
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

  it('throws when custom URL is set but not approved', () => {
    expect(() => resolveApprovedBaseUrl('https://api.openai.com/v1', '')).toThrow(/not approved/i);
  });

  it('throws when endpoint changed since approval', () => {
    expect(() =>
      resolveApprovedBaseUrl('https://openrouter.ai/api/v1', 'https://api.openai.com'),
    ).toThrow(/not approved/i);
  });
});

describe('isOriginCspAllowed', () => {
  it('includes official provider origins', () => {
    expect(isOriginCspAllowed('https://api.anthropic.com')).toBe(true);
  });

  it('includes Ollama loopback origins', () => {
    expect(isOriginCspAllowed('http://localhost:11434')).toBe(true);
    expect(isOriginCspAllowed('http://127.0.0.1:11434')).toBe(true);
    expect(isOriginCspAllowed('http://[::1]:11434')).toBe(true);
  });
});
