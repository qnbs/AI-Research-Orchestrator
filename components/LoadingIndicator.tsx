import React, { useState, useEffect, useRef } from 'react';

interface LoadingIndicatorProps {
  phase: string;
}

const loadingPhases = [
  "Phase 1: Formulating Advanced PubMed Queries...",
  "Phase 2: Retrieving and Scanning Article Abstracts...",
  "Phase 3: Filtering Articles Based on Criteria...",
  "Phase 4: Ranking Articles for Relevance...",
  "Phase 5: Synthesizing Top Findings & Extracting Keywords...",
  "Finalizing Report..."
];

const phaseDetails: Record<string, string[]> = {
  "Phase 1: Formulating Advanced PubMed Queries...": [
    "Analyzing research topic and user criteria...",
    "AI is constructing advanced boolean search strings...",
    "Finalizing query logic for optimal retrieval...",
  ],
  "Phase 2: Retrieving and Scanning Article Abstracts...": [
    "Executing queries against live PubMed database...",
    "Fetching article metadata (titles, authors, journals)...",
    "Gathering article identifiers for analysis...",
  ],
  "Phase 3: Filtering Articles Based on Criteria...": [
    "AI is finding abstracts for fetched articles...",
    "Applying date range and article type filters...",
    "Performing initial screening of content...",
  ],
  "Phase 4: Ranking Articles for Relevance...": [
    "AI is scoring each article for relevance (1-100)...",
    "Writing relevance explanations...",
    "Sorting articles from highest to lowest score...",
  ],
  "Phase 5: Synthesizing Top Findings & Extracting Keywords...": [
    "Selecting top N articles for synthesis...",
    "Analyzing top articles for common themes...",
    "Extracting 3-5 keywords from each top article...",
    "Generating AI-powered insights...",
  ],
  "Finalizing Report...": [
    "Generating executive narrative synthesis...",
    "Compiling overall keyword frequencies...",
    "Assembling final JSON report structure...",
  ]
};

const CyberneticSpinner: React.FC = () => (
    <svg viewBox="0 0 100 100" className="w-24 h-24">
        {/* Static Rings */}
        <circle cx="50" cy="50" r="45" fill="none" stroke="var(--color-border)" strokeWidth="1" opacity="0.5" />
        <circle cx="50" cy="50" r="35" fill="none" stroke="var(--color-border)" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />

        {/* Outer Ring Animation */}
        <circle cx="50" cy="50" r="45" fill="none" stroke="var(--color-brand-accent)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="60 220">
            <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="8s" repeatCount="indefinite" />
        </circle>
        
        {/* Inner Ring Animation */}
        <circle cx="50" cy="50" r="35" fill="none" stroke="var(--color-accent-cyan)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="40 180">
            <animateTransform attributeName="transform" type="rotate" from="360 50 50" to="0 50 50" dur="6s" repeatCount="indefinite" />
        </circle>
        
        {/* Central Pulse */}
        <circle cx="50" cy="50" r="10" fill="var(--color-brand-accent)">
            <animate attributeName="r" from="10" to="12" dur="1s" begin="0s" repeatCount="indefinite" />
            <animate attributeName="opacity" from="1" to="0.5" dur="1s" begin="0s" repeatCount="indefinite" />
        </circle>
    </svg>
);


export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ phase }) => {
    const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
    const [currentSubPhase, setCurrentSubPhase] = useState('');
    const subPhaseIntervalRef = useRef<number | null>(null);

    useEffect(() => {
        const index = loadingPhases.findIndex(p => p === phase);
        if (index !== -1) {
            setCurrentPhaseIndex(index);
        }

        if (subPhaseIntervalRef.current) {
            clearInterval(subPhaseIntervalRef.current);
        }

        const subPhases = phaseDetails[phase] || [];
        if (subPhases.length > 0) {
            let subPhaseIndex = 0;
            setCurrentSubPhase(subPhases[subPhaseIndex]);
            
            subPhaseIntervalRef.current = window.setInterval(() => {
                subPhaseIndex = (subPhaseIndex + 1) % subPhases.length;
                setCurrentSubPhase(subPhases[subPhaseIndex]);
            }, 1500);
        } else {
            setCurrentSubPhase('');
        }
        
        return () => {
            if (subPhaseIntervalRef.current) {
                clearInterval(subPhaseIntervalRef.current);
            }
        };

    }, [phase]);

    return (
        <div className="flex flex-col items-center justify-center text-center p-8 bg-surface/50 rounded-lg border border-border">
            <CyberneticSpinner />
            <h2 className="text-xl font-semibold brand-gradient-text mt-6 mb-2">Orchestrating AI Agents...</h2>
            <div className="w-full max-w-2xl mx-auto mt-4 overflow-hidden text-center">
                 <p className="text-text-primary text-base font-semibold mb-2">{phase}</p>
                <div className="relative h-2 bg-border rounded-full">
                    <div
                        className="absolute top-0 left-0 h-2 bg-brand-accent rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${((currentPhaseIndex + 1) / loadingPhases.length) * 100}%` }}
                    ></div>
                </div>
                <p className="text-text-secondary text-sm mt-3 min-h-[20px] transition-opacity duration-300">{currentSubPhase}</p>
            </div>
        </div>
    );
};
