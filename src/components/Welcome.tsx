
import React from 'react';
import { DocumentPlusIcon } from './icons/DocumentPlusIcon';

export const Welcome: React.FC = () => {
    return (
        <div className="text-center text-text-secondary p-10 flex flex-col items-center justify-center h-full mt-6 animate-fadeIn glass-panel rounded-xl">
            <div className="relative mb-6 group">
                <DocumentPlusIcon className="h-24 w-24 text-border group-hover:text-brand-accent transition-colors duration-500"/>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10">
                    <div className="w-24 h-24 rounded-full bg-brand-accent/20 animate-pulseGlow filter blur-2xl" style={{ animationDuration: '4s' }}></div>
                </div>
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-3 brand-gradient-text">Start a New Literature Review</h2>
            <p className="max-w-xl mx-auto text-base leading-relaxed">
                Configure the AI agents above to orchestrate a comprehensive search. <br/>
                <span className="text-sm opacity-75">The system will analyze PubMed in real-time.</span>
            </p>
        </div>
    );
};
