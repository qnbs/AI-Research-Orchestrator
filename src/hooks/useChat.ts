import { useState, useEffect, useCallback, useRef } from 'react';
import type { Chat } from '@google/genai';
import type { ChatMessage, ResearchReport, Settings } from '../types';
import { startChatWithReport } from '../services/geminiService';
import { useUI } from '../contexts/UIContext';

/**
 * Report-grounded chat session: initializes when a report reaches `done`,
 * streams model replies into `chatHistory`, and resets when the report clears.
 *
 * Session lives only in a ref (not React state) so sendMessage never sees a
 * stale Chat after report replacement, and late inits cannot resurrect one.
 */
export const useChat = (
  report: ResearchReport | null,
  reportStatus: 'idle' | 'generating' | 'streaming' | 'done' | 'error',
  aiSettings: Settings['ai'],
) => {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatting, setIsChatting] = useState(false);
  const { setNotification } = useUI();
  const isMounted = useRef(true);
  const chatSessionRef = useRef<Chat | null>(null);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!(report && reportStatus === 'done')) {
      return;
    }
    let cancelled = false;
    // Drop prior session immediately so sendMessage cannot target a stale report
    chatSessionRef.current = null;
    setChatHistory([]);

    const initChat = async () => {
      try {
        const session = await startChatWithReport(report, aiSettings);
        if (isMounted.current && !cancelled) {
          chatSessionRef.current = session;
        }
      } catch (error) {
        console.error('Failed to initialize chat:', error);
        if (isMounted.current && !cancelled) {
          setNotification({
            id: Date.now(),
            message: error instanceof Error ? error.message : 'Chat could not be initialized.',
            type: 'error',
          });
        }
      }
    };
    void initChat();
    return () => {
      cancelled = true;
      chatSessionRef.current = null;
    };
  }, [report, reportStatus, aiSettings, setNotification]);

  // Also reset when the report disappears (e.g., new search)
  useEffect(() => {
    if (!report) {
      chatSessionRef.current = null;
      setChatHistory([]);
    }
  }, [report]);

  const sendMessage = useCallback(
    async (message: string) => {
      const session = chatSessionRef.current;
      if (!session) return;

      setIsChatting(true);
      setChatHistory((prev) => [
        ...prev,
        { role: 'user', parts: [{ text: message }], timestamp: Date.now() },
      ]);

      try {
        const stream = await session.sendMessageStream({ message });
        let responseText = '';

        // Add a placeholder for the model's response
        setChatHistory((prev) => [
          ...prev,
          { role: 'model', parts: [{ text: '' }], timestamp: Date.now() },
        ]);

        for await (const chunk of stream) {
          if (!isMounted.current) break;
          responseText += chunk.text;
          setChatHistory((prev) => {
            const newHistory = [...prev];
            const lastMessage = newHistory[newHistory.length - 1];
            if (lastMessage && lastMessage.role === 'model') {
              lastMessage.parts[0].text = responseText;
            }
            return newHistory;
          });
        }
      } catch (err) {
        if (isMounted.current) {
          setNotification({
            id: Date.now(),
            message: `Chat error: ${err instanceof Error ? err.message : 'Unknown issue'}`,
            type: 'error',
          });
        }
      } finally {
        if (isMounted.current) {
          setIsChatting(false);
        }
      }
    },
    [setNotification],
  );

  return { chatHistory, isChatting, sendMessage };
};
