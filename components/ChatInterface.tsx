import React, { useState, useRef, useEffect } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { ChatMessage } from '../types';
import { PaperAirplaneIcon } from './icons/PaperAirplaneIcon';
import { UserIcon } from './icons/UserIcon';
import { SparklesIcon } from './icons/SparklesIcon';

interface ChatInterfaceProps {
    history: ChatMessage[];
    isChatting: boolean;
    onSendMessage: (message: string) => void;
}

const secureMarkdownToHtml = (text: string): string => {
    if (!text) return '';
    const rawMarkup = marked.parse(text.trim(), { breaks: true, gfm: true }) as string;
    return DOMPurify.sanitize(rawMarkup);
};

const TypingIndicator = () => (
    <div className="flex items-center space-x-1.5 p-2">
        <div className="w-2 h-2 bg-text-secondary rounded-full animate-pulse" style={{ animationDelay: '0s' }}></div>
        <div className="w-2 h-2 bg-text-secondary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-2 h-2 bg-text-secondary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
    </div>
);

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ history, isChatting, onSendMessage }) => {
    const [inputMessage, setInputMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history]);

    useEffect(() => {
        if (!isChatting) {
            inputRef.current?.focus();
        }
    }, [isChatting]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputMessage.trim() && !isChatting) {
            onSendMessage(inputMessage.trim());
            setInputMessage('');
        }
    };
    
    if (!history) return null;

    return (
        <div className="bg-background/50 rounded-lg border border-border flex flex-col h-[60vh] max-h-[700px]">
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {history.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-text-secondary">
                        <SparklesIcon className="h-12 w-12 text-border mb-4"/>
                        <p className="font-semibold text-text-primary">Ready to assist!</p>
                        <p className="text-sm">Ask a follow-up question, request a summary of a specific article, or probe for deeper connections.</p>
                    </div>
                )}
                {history.map((msg, index) => (
                    <div key={msg.timestamp + '-' + index} className={`flex items-start gap-3 animate-fadeIn ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                       {msg.role === 'model' && (
                           <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-accent/20 flex items-center justify-center border border-brand-accent/30">
                               <SparklesIcon className="h-5 w-5 text-brand-accent" />
                           </div>
                       )}

                        <div className={`max-w-lg p-3 rounded-xl ${msg.role === 'user' ? 'bg-brand-accent text-brand-text-on-accent rounded-br-none' : 'bg-surface border border-border rounded-bl-none'}`}>
                            <div className="prose prose-sm prose-invert max-w-none text-text-primary" dangerouslySetInnerHTML={{ __html: secureMarkdownToHtml(msg.parts[0].text) }}/>
                             {msg.role === 'model' && isChatting && index === history.length - 1 && <TypingIndicator />}
                        </div>
                        
                        {msg.role === 'user' && (
                           <div className="flex-shrink-0 w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center">
                               <UserIcon className="h-5 w-5 text-text-secondary" />
                           </div>
                       )}
                    </div>
                ))}
                 <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-border bg-surface/50">
                <form onSubmit={handleSubmit} className="flex items-center gap-3">
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder="Ask a follow-up question..."
                        disabled={isChatting}
                        className="flex-1 block w-full bg-background border border-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-accent sm:text-sm disabled:opacity-50"
                    />
                    <button type="submit" disabled={isChatting || !inputMessage.trim()} className="p-2.5 rounded-md text-brand-text-on-accent bg-brand-accent hover:bg-opacity-90 disabled:bg-border disabled:text-text-secondary transition-colors">
                        <PaperAirplaneIcon className="h-5 w-5" />
                         <span className="sr-only">Send message</span>
                    </button>
                </form>
            </div>
        </div>
    );
};
