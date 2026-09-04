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
  customBaseUrl: '' as string,
}));

vi.mock('../hooks/useInferenceMode', () => ({
  useInferenceMode: () => inference,
}));

vi.mock('../contexts/SettingsContext', () => ({
  useSettings: () => ({
    settings: { ai: { model: settingsState.model, customBaseUrl: settingsState.customBaseUrl } },
  }),
}));

vi.mock('../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, string>) => (vars?.model ? `${key}:${vars.model}` : key),
    lang: 'en',
  }),
}));

function renderOllamaStatus(model: string, customBaseUrl = '') {
  settingsState.model = model;
  settingsState.customBaseUrl = customBaseUrl;
  inference.mode = 'live';
  inference.reason = 'key';
  inference.provider = 'ollama';
  return render(<ProviderStatusLine />);
}

describe('ProviderStatusLine', () => {
  it('uses the Ollama provider default model when settings.model is empty', () => {
    renderOllamaStatus('');
    expect(
      screen.getByText(`provider.status.ollama:${getProviderMeta('ollama').defaultModel}`),
    ).toBeInTheDocument();
  });

  it('ignores a leftover Gemini default model when the live provider is Ollama', () => {
    renderOllamaStatus(getProviderMeta('gemini').defaultModel);
    expect(
      screen.getByText(`provider.status.ollama:${getProviderMeta('ollama').defaultModel}`),
    ).toBeInTheDocument();
  });

  it('shows a persistent PubMed/arXiv privacy note when live Ollama is selected', () => {
    renderOllamaStatus('llama3.1:8b');
    expect(screen.getByTestId('provider-status-ollama-privacy')).toHaveTextContent(
      'provider.status.ollama_privacy',
    );
  });

  it('does not claim on-device generation when the Ollama base URL is not loopback', () => {
    renderOllamaStatus('llama3.1:8b', 'https://ollama.example:11434');
    expect(screen.getByTestId('provider-status-ollama-privacy')).toHaveTextContent(
      'provider.status.ollama_privacy_remote',
    );
  });

  it('hides the Ollama privacy note in heuristic mode', () => {
    settingsState.model = 'llama3.1:8b';
    inference.mode = 'heuristic';
    inference.reason = 'no-key';
    inference.provider = 'heuristic';
    render(<ProviderStatusLine />);
    expect(screen.queryByTestId('provider-status-ollama-privacy')).toBeNull();
  });
});
