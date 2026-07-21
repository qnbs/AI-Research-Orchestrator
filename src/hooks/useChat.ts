import { useState, useEffect, useCallback, useRef } from 'react';
import type { ChatMessage, ResearchReport, Settings } from '../types';
import { startChatWithReport, type ReportChatSession } from '../services/geminiService';
import { useUI } from '../contexts/UIContext';

/**
 * Report-grounded chat session: initializes when a report reaches `done`,
 * streams model replies into `chatHistory`, and resets when the report clears.
 *
 * Session lives only in a ref. A monotonic `sessionGenerationRef` invalidates
 * in-flight streams when the report changes so delayed chunks cannot mutate
 * the replacement chat.
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
  const chatSessionRef = useRef<ReportChatSession | null>(null);
  const sessionGenerationRef = useRef(0);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const invalidateSession = useCallback(() => {
    sessionGenerationRef.current += 1;
    chatSessionRef.current = null;
    setChatHistory([]);
    setIsChatting(false);
  }, []);

  useEffect(() => {
    if (!(report && reportStatus === 'done')) {
      return;
    }
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets chat session state before starting a new async chat init; bundled with the network call and cleanup below, which must be an effect.
    invalidateSession();

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
      sessionGenerationRef.current += 1;
    };
  }, [report, reportStatus, aiSettings, setNotification, invalidateSession]);

  // Also reset when the report disappears (e.g., new search)
  useEffect(() => {
    if (!report) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clears session state in reaction to the report going away; not derivable from render.
      invalidateSession();
    }
  }, [report, invalidateSession]);

  const sendMessage = useCallback(
    async (message: string) => {
      const session = chatSessionRef.current;
      if (!session) return;
      const generation = sessionGenerationRef.current;

      setIsChatting(true);
      setChatHistory((prev) => [
        ...prev,
        { role: 'user', parts: [{ text: message }], timestamp: Date.now() },
      ]);

      try {
        const stream = await session.sendMessageStream({ message });
        if (!isMounted.current || generation !== sessionGenerationRef.current) return;

        let responseText = '';

        // Add a placeholder for the model's response
        setChatHistory((prev) => [
          ...prev,
          { role: 'model', parts: [{ text: '' }], timestamp: Date.now() },
        ]);

        for await (const chunk of stream) {
          if (!isMounted.current || generation !== sessionGenerationRef.current) break;
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
        if (isMounted.current && generation === sessionGenerationRef.current) {
          setNotification({
            id: Date.now(),
            message: `Chat error: ${err instanceof Error ? err.message : 'Unknown issue'}`,
            type: 'error',
          });
        }
      } finally {
        if (isMounted.current && generation === sessionGenerationRef.current) {
          setIsChatting(false);
        }
      }
    },
    [setNotification],
  );

  return { chatHistory, isChatting, sendMessage };
};
