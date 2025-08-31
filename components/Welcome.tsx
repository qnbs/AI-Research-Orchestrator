import React from 'react';
import { DocumentPlusIcon } from './icons/DocumentPlusIcon';

export const Welcome: React.FC = () => {
    return (
        <div className="text-center text-text-secondary p-8 flex flex-col items-center justify-center h-full mt-10 animate-fadeIn">
            <div className="relative mb-6">
                <DocumentPlusIcon className="h-24 w-24 text-border"/>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="w-16 h-16 rounded-full bg-brand-accent/10 animate-pulseGlow" style={{ animationDuration: '3s' }}></div>
                </div>
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-3">Start a New Literature Review</h2>
            <p className="max-w-xl mx-auto text-base">
                Define your research parameters in the form above to have the AI agents conduct a comprehensive review of the PubMed database for you.
            </p>
        </div>
    );
};
