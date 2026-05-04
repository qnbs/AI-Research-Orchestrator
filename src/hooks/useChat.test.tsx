import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useChat } from './useChat';
import type { ResearchReport, Settings } from '../types';
import * as geminiService from '../services/geminiService';

const chatMocks = vi.hoisted(() => ({
  sendMessageStream: vi.fn().mockImplementation(async function* () {
    yield { text: 'Hello' };
  }),
}));

vi.mock('../services/geminiService', () => ({
  startChatWithReport: vi.fn().mockResolvedValue({
    sendMessageStream: chatMocks.sendMessageStream,
  }),
}));

const setNotification = vi.fn();
vi.mock('../contexts/UIContext', () => ({
  useUI: () => ({ setNotification }),
}));

const minimalReport: ResearchReport = {
  synthesis: 'syn',
  rankedArticles: [],
  generatedQueries: [],
  aiGeneratedInsights: [],
  overallKeywords: [],
};

const ai: Settings['ai'] = {
  model: 'gemini-2.5-flash',
  customPreamble: '',
  temperature: 0.5,
  aiLanguage: 'English',
  aiPersona: 'Neutral Scientist',
  researchAssistant: {
    autoFetchSimilar: false,
    autoFetchOnline: false,
    authorSearchLimit: 10,
  },
  enableTldr: true,
};

describe('useChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes chat when report is done', async () => {
    type Props = {
      report: ResearchReport | null;
      status: 'idle' | 'generating' | 'streaming' | 'done' | 'error';
    };
    const { rerender } = renderHook(({ report, status }: Props) => useChat(report, status, ai), {
      initialProps: {
        report: null as ResearchReport | null,
        status: 'idle' as Props['status'],
      },
    });

    rerender({ report: minimalReport, status: 'done' });

    await waitFor(() => {
      expect(vi.mocked(geminiService.startChatWithReport)).toHaveBeenCalled();
    });
  });
});
