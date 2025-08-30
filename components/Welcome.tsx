import React from 'react';
import { KnowledgeBaseEntry } from '../types';
import { HistoryIcon } from './icons/HistoryIcon';
import { DocumentPlusIcon } from './icons/DocumentPlusIcon';

interface WelcomeProps {
    entries: KnowledgeBaseEntry[];
    onViewReport: (entry: KnowledgeBaseEntry) => void;
    onStartNewReview: (topic: string) => void;
}

const synthesisFocusText: { [key: string]: string } = {
  'overview': 'Broad Overview',
  'clinical': 'Clinical Implications',
  'future': 'Future Research',
  'gaps': 'Contradictions & Gaps'
};

export const Welcome: React.FC<WelcomeProps> = ({ entries, onViewReport, onStartNewReview }) => {
    const recentEntries = entries.slice(-3).reverse();

    return (
        <div className="text-center text-text-secondary p-8 flex flex-col items-center justify-center h-full mt-10 animate-fadeIn">
            <div className="relative mb-6">
                <DocumentPlusIcon className="h-24 w-24 text-border"/>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="w-16 h-16 rounded-full bg-brand-accent/10 animate-ping"></div>
                </div>
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-3">Start a New Literature Review</h2>
            <p className="max-w-xl mx-auto text-base mb-12">
                Define your research parameters in the form above to have the AI agents conduct a comprehensive review of the PubMed database for you.
            </p>

            {recentEntries.length > 0 && (
                <div className="w-full max-w-4xl text-left mt-8">
                     <div className="flex items-center gap-3 mb-6">
                        <HistoryIcon className="h-7 w-7 brand-gradient-text" />
                        <h2 className="text-2xl font-bold text-text-primary">Recent Activity</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {recentEntries.map(entry => (
                            <div key={entry.id} className="bg-surface border border-border rounded-lg p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:border-brand-accent/50 hover:-translate-y-1 group">
                                <div>
                                    <p className="text-xs text-text-secondary mb-2">Report from {new Date(parseInt(entry.id.split('-')[0])).toLocaleDateString()}</p>
                                    <button
                                        onClick={() => onStartNewReview(entry.input.researchTopic)}
                                        className="font-semibold text-text-primary mb-3 h-20 overflow-hidden text-left group-hover:text-brand-accent focus:outline-none focus:text-brand-accent transition-colors w-full"
                                        title={`Start new search for: ${entry.input.researchTopic}`}
                                    >
                                        {entry.input.researchTopic}
                                    </button>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary border-t border-border pt-3">
                                        <span><strong>{entry.report.rankedArticles.length}</strong> articles</span>
                                        <span><strong>Focus:</strong> {synthesisFocusText[entry.input.synthesisFocus]}</span>
                                    </div>
                                </div>
                                 <button
                                    onClick={() => onViewReport(entry)}
                                    className="w-full mt-5 inline-flex justify-center items-center py-2 px-4 border border-border shadow-sm text-sm font-semibold rounded-md text-text-primary bg-background group-hover:bg-brand-accent group-hover:text-brand-text-on-accent focus:outline-none transition-colors"
                                >
                                    View Report
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
