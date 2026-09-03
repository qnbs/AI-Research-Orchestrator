import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProviderStatusLine } from './ProviderStatusLine';
import { getProviderMeta } from '../services/providers/provider';

const inference = vi.hoisted(() => ({
  mode: 'live' as string,
  reason: 'key' as string,
  provider: 'ollama' as string,
}));

const settingsState = vi.hoisted(() => ({
  model: '' as string,
}));

vi.mock('../hooks/useInferenceMode', () => ({
  useInferenceMode: () => inference,
}));

vi.mock('../contexts/SettingsContext', () => ({
  useSettings: () => ({ settings: { ai: { model: settingsState.model } } }),
}));

vi.mock('../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, string>) => (vars?.model ? `${key}:${vars.model}` : key),
    lang: 'en',
  }),
}));

describe('ProviderStatusLine', () => {
  it('uses the Ollama provider default model when settings.model is empty', () => {
    settingsState.model = '';
    inference.mode = 'live';
    inference.reason = 'key';
    inference.provider = 'ollama';
    render(<ProviderStatusLine />);
    expect(
      screen.getByText(`provider.status.ollama:${getProviderMeta('ollama').defaultModel}`),
    ).toBeInTheDocument();
  });
});
