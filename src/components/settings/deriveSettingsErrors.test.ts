import { describe, it, expect } from 'vitest';
import { defaultSettings } from '../../store/slices/settingsSlice';
import { deriveSettingsErrors } from './deriveSettingsErrors';

const t = (key: string, params?: Record<string, string>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

describe('deriveSettingsErrors', () => {
  it('flags invalid custom endpoint URLs', () => {
    const settings = {
      ...defaultSettings,
      ai: { ...defaultSettings.ai, customBaseUrl: 'not-a-url' },
    };
    const errors = deriveSettingsErrors(settings, t);
    expect(errors.endpoint).toContain('settings.ai.base_url_invalid');
  });

  it('flags whitespace-only custom endpoint values', () => {
    const settings = {
      ...defaultSettings,
      ai: { ...defaultSettings.ai, customBaseUrl: '   ' },
    };
    const errors = deriveSettingsErrors(settings, t);
    expect(errors.endpoint).toContain('settings.ai.base_url_invalid');
  });

  it('flags CSP-blocked origins', () => {
    const settings = {
      ...defaultSettings,
      ai: { ...defaultSettings.ai, customBaseUrl: 'https://custom.example/v1' },
    };
    const errors = deriveSettingsErrors(settings, t);
    expect(errors.endpoint).toContain('settings.ai.base_url_csp_blocked');
  });

  it('flags unapproved but CSP-allowed origins', () => {
    const settings = {
      ...defaultSettings,
      ai: {
        ...defaultSettings.ai,
        customBaseUrl: 'https://api.openai.com/v1',
        approvedEndpointOrigin: '',
      },
    };
    const errors = deriveSettingsErrors(settings, t);
    expect(errors.endpoint).toContain('settings.error.endpoint_not_approved');
  });
});
