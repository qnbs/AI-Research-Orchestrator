import { describe, expect, it } from 'vitest';
import { translations } from './translations';

function interpolate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? `{${key}}`);
}

describe('orchestrator.cost_preflight interpolation', () => {
  const values = { usd: '0.042', tier: 'low' };

  it('renders explicit USD currency marker in EN', () => {
    const out = interpolate(translations.en['orchestrator.cost_preflight'], values);
    expect(out).toMatch(/\$\s*0\.042/);
    expect(out).toContain('(low)');
  });

  it('renders explicit USD currency marker in DE', () => {
    const out = interpolate(translations.de['orchestrator.cost_preflight'], values);
    expect(out).toMatch(/\$\s*0\.042/);
    expect(out).toContain('(low)');
  });
});
