
import React from 'react';
import type { KnowledgeBaseEntry, ResearchEntry } from '../types';
import { HistoryIcon } from './icons/HistoryIcon';
import { DocumentPlusIcon } from './icons/DocumentPlusIcon';
import { useKnowledgeBase } from '../contexts/KnowledgeBaseContext';

interface OrchestratorDashboardProps {
    onViewReport: (entry: KnowledgeBaseEntry) => void;
    onStartNewReview: (topic: string) => void;
}

const synthesisFocusText: { [key: string]: string } = {
  'overview': 'Broad Overview',
  'clinical': 'Clinical Implications',
  'future': 'Future Research',
  'gaps': 'Contradictions & Gaps'
};

const DashboardComponent: React.FC<OrchestratorDashboardProps> = ({ onViewReport, onStartNewReview }) => {
    const { getRecentResearchEntries } = useKnowledgeBase();
    const recentEntries = getRecentResearchEntries(3);

    if (recentEntries.length === 0) {
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
    }
    
    return (
        <div className="mt-12 animate-fadeIn">
            <div className="flex items-center gap-3 mb-6">
                <HistoryIcon className="h-7 w-7 brand-gradient-text" />
                <h2 className="text-2xl font-bold text-text-primary">Recent Activity</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recentEntries.map((entry: ResearchEntry) => (
                    <div key={entry.id} className="bg-surface border border-border rounded-lg p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:border-brand-accent/50 hover:-translate-y-1 group focus-within:ring-2 focus-within:ring-brand-accent focus-within:border-brand-accent/50">
                        <div>
                            <p className="text-xs text-text-secondary mb-2">Report from {new Date(entry.timestamp).toLocaleDateString()}</p>
                            <button
                                onClick={() => onStartNewReview(entry.input.researchTopic)}
                                className="font-semibold text-text-primary mb-3 h-20 overflow-hidden text-left group-hover:text-brand-accent focus:outline-none focus:text-brand-accent transition-colors w-full rounded"
                                title={`Start new search for: ${entry.input.researchTopic}`}
                            >
                                {entry.title}
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
    );
};

export const OrchestratorDashboard = React.memo(DashboardComponent);
