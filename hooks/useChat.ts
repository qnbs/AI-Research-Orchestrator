import { useState, useEffect, useCallback } from 'react';
import type { Chat } from '@google/genai';
import type { ChatMessage, ResearchReport, Settings } from '../types';
import { startChatWithReport } from '../services/geminiService';
import { useUI } from '../contexts/UIContext';

export const useChat = (
    report: ResearchReport | null,
    reportStatus: 'idle' | 'generating' | 'streaming' | 'done' | 'error',
    aiSettings: Settings['ai']
) => {
    const [chatSession, setChatSession] = useState<Chat | null>(null);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [isChatting, setIsChatting] = useState(false);
    const { setNotification } = useUI();

    useEffect(() => {
        if (report && reportStatus === 'done') {
            const session = startChatWithReport(report, aiSettings);
            setChatSession(session);
            // Reset chat history when a new report is finalized
            setChatHistory([]);
        }
    }, [report, reportStatus, aiSettings]);
    
    // Also reset when the report disappears (e.g., new search)
    useEffect(() => {
        if (!report) {
            setChatSession(null);
            setChatHistory([]);
        }
    }, [report]);

    const sendMessage = useCallback(async (message: string) => {
        if (!chatSession) return;
        
        setIsChatting(true);
        setChatHistory(prev => [...prev, { role: 'user', parts: [{text: message}], timestamp: Date.now() }]);

        try {
            const stream = await chatSession.sendMessageStream({ message });
            let responseText = "";
            
            // Add a placeholder for the model's response
            setChatHistory(prev => [...prev, { role: 'model', parts: [{text: ''}], timestamp: Date.now() }]);
            
            for await (const chunk of stream) {
                responseText += chunk.text;
                setChatHistory(prev => {
                    const newHistory = [...prev];
                    const lastMessage = newHistory[newHistory.length - 1];
                    if (lastMessage && lastMessage.role === 'model') {
                        lastMessage.parts[0].text = responseText;
                    }
                    return newHistory;
                });
            }
        } catch (err) {
             setNotification({id: Date.now(), message: `Chat error: ${err instanceof Error ? err.message : 'Unknown issue'}`, type: 'error' });
        } finally {
            setIsChatting(false);
        }
    }, [chatSession, setNotification]);

    return { chatHistory, isChatting, sendMessage };
};
