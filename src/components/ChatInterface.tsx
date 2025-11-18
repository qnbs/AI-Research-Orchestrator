
import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../types';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { SparklesIcon } from './icons/SparklesIcon';

interface ChatInterfaceProps {
    history: ChatMessage[];
    isChatting: boolean;
    onSendMessage: (message: string) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ history, isChatting, onSendMessage }) => {
    const [input, setInput] = useState('');
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history, isChatting]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isChatting) return;
        onSendMessage(input);
        setInput('');
    };

    const secureMarkdown = (text: string) => {
        const raw = marked.parse(text) as string;
        return { __html: DOMPurify.sanitize(raw) };
    };

    return (
        <div className="flex flex-col h-[500px] bg-background rounded-lg border border-border">
            <div className="flex-grow overflow-y-auto p-4 space-y-4">
                {history.length === 0 && (
                    <div className="text-center text-text-secondary mt-10">
                        <SparklesIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Ask questions about this report to explore the data further.</p>
                    </div>
                )}
                {history.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div 
                            className={`max-w-[80%] rounded-lg p-3 text-sm ${
                                msg.role === 'user' 
                                    ? 'bg-brand-accent text-brand-text-on-accent' 
                                    : 'bg-surface border border-border text-text-primary prose prose-sm prose-invert max-w-none'
                            }`}
                        >
                            {msg.role === 'user' ? msg.parts[0].text : (
                                <div dangerouslySetInnerHTML={secureMarkdown(msg.parts[0].text)} />
                            )}
                        </div>
                    </div>
                ))}
                {isChatting && (
                    <div className="flex justify-start">
                        <div className="bg-surface border border-border rounded-lg p-3">
                            <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                                <div className="w-2 h-2 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                <div className="w-2 h-2 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={endRef} />
            </div>
            <form onSubmit={handleSubmit} className="p-3 border-t border-border bg-surface rounded-b-lg flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask a follow-up question..."
                    className="flex-grow bg-input-bg border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    disabled={isChatting}
                />
                <button 
                    type="submit" 
                    disabled={!input.trim() || isChatting}
                    className="bg-brand-accent text-brand-text-on-accent px-4 py-2 rounded-md text-sm font-semibold disabled:opacity-50 hover:bg-opacity-90 transition-colors"
                >
                    Send
                </button>
            </form>
        </div>
    );
};
