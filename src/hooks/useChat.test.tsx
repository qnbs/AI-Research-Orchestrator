import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useChat } from './useChat';
import type { ResearchReport, Settings } from '../types';
import * as geminiService from '../services/geminiService';

const chatMocks = vi.hoisted(() => ({
  sendMessageStream: vi.fn().mockImplementation(async function* () {
    yield { text: 'Hello' };
    yield { text: ' world' };
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
  ncbiApiKey: '',
};

describe('useChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chatMocks.sendMessageStream.mockImplementation(async function* () {
      yield { text: 'Hello' };
      yield { text: ' world' };
    });
    vi.mocked(geminiService.startChatWithReport).mockResolvedValue({
      sendMessageStream: chatMocks.sendMessageStream,
    } as never);
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

  it('resets session when report is cleared', async () => {
    type Props = {
      report: ResearchReport | null;
      status: 'idle' | 'generating' | 'streaming' | 'done' | 'error';
    };
    const { result, rerender } = renderHook(
      ({ report, status }: Props) => useChat(report, status, ai),
      {
        initialProps: {
          report: minimalReport as ResearchReport | null,
          status: 'done' as Props['status'],
        },
      },
    );

    await waitFor(() => {
      expect(vi.mocked(geminiService.startChatWithReport)).toHaveBeenCalled();
    });

    rerender({ report: null, status: 'idle' });
    await waitFor(() => {
      expect(result.current.chatHistory).toEqual([]);
    });
  });

  it('streams sendMessage into chat history', async () => {
    const { result } = renderHook(() => useChat(minimalReport, 'done', ai));

    await waitFor(() => {
      expect(vi.mocked(geminiService.startChatWithReport)).toHaveBeenCalled();
    });

    await act(async () => {
      await result.current.sendMessage('Hi');
    });

    await waitFor(() => {
      expect(result.current.chatHistory.length).toBeGreaterThanOrEqual(2);
      expect(result.current.chatHistory[0].role).toBe('user');
      expect(result.current.chatHistory[1].parts[0].text).toContain('Hello');
    });
    expect(result.current.isChatting).toBe(false);
  });

  it('notifies on init failure', async () => {
    vi.mocked(geminiService.startChatWithReport).mockRejectedValueOnce(new Error('no key'));
    renderHook(() => useChat(minimalReport, 'done', ai));
    await waitFor(() => {
      expect(setNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', message: expect.stringContaining('no key') }),
      );
    });
  });

  it('notifies on sendMessage failure', async () => {
    chatMocks.sendMessageStream.mockRejectedValueOnce(new Error('stream fail'));
    const { result } = renderHook(() => useChat(minimalReport, 'done', ai));
    await waitFor(() => {
      expect(vi.mocked(geminiService.startChatWithReport)).toHaveBeenCalled();
    });
    await act(async () => {
      await result.current.sendMessage('boom');
    });
    await waitFor(() => {
      expect(setNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', message: expect.stringContaining('stream fail') }),
      );
    });
  });
});
