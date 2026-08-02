import { describe, expect, it } from 'vitest';
import { resolveTranslation } from './translate';

describe('orchestrator.cost_preflight interpolation', () => {
  const values = { usd: '0.042', tier: 'gemini-flash', provider: 'Google Gemini' };

  it('renders explicit USD currency marker in EN', () => {
    const out = resolveTranslation('en', 'orchestrator.cost_preflight', values);
    expect(out).toMatch(/\$\s*0\.042/);
    expect(out).toContain('Google Gemini');
    expect(out).toContain('gemini-flash');
  });

  it('renders explicit USD currency marker in DE', () => {
    const out = resolveTranslation('de', 'orchestrator.cost_preflight', values);
    expect(out).toMatch(/\$\s*0\.042/);
    expect(out).toContain('gemini-flash');
  });
});
