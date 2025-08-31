import React, { useState, useEffect, useRef } from 'react';

interface LoadingIndicatorProps {
  phase: string;
}

const loadingPhases = [
  "Phase 1: AI Generating PubMed Queries...",
  "Phase 2: Executing Real-time PubMed Search...",
  "Phase 3: Fetching Article Details from PubMed...",
  "Phase 4: AI Ranking & Analysis of Real Articles...",
  "Phase 5: Synthesizing Top Findings...",
  "Streaming Synthesis...",
  "Finalizing Report..."
];

const phaseDetails: Record<string, string[]> = {
  "Phase 1: AI Generating PubMed Queries...": [
    "Analyzing research topic and user criteria...",
    "AI is constructing advanced boolean search strings...",
    "Optimizing queries for relevance...",
  ],
  "Phase 2: Executing Real-time PubMed Search...": [
    "Connecting to live NCBI PubMed database...",
    "Submitting best query to retrieve article IDs...",
    "Compiling list of relevant publications...",
  ],
  "Phase 3: Fetching Article Details from PubMed...": [
    "Requesting abstracts and metadata for found articles...",
    "Parsing publication data (titles, authors, journals)...",
    "Preparing real-world data for AI analysis...",
  ],
  "Phase 4: AI Ranking & Analysis of Real Articles...": [
    "AI is reading and scoring each article for relevance...",
    "Writing relevance explanations based on content...",
    "Identifying key themes and generating insights...",
  ],
  "Phase 5: Synthesizing Top Findings...": [
    "Selecting top articles for the executive summary...",
    "Preparing final prompt for narrative synthesis...",
    "Initializing streaming connection with AI...",
  ],
  "Streaming Synthesis...": [
    "Receiving synthesized text in real-time...",
    "Building the narrative summary chunk by chunk...",
  ],
  "Finalizing Report...": [
    "Assembling final report structure...",
    "Finishing up...",
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
                 <p className="text-text-primary text-base font-semibold mb-2" role="status" aria-live="polite">{phase}</p>
                <div className="relative h-2 bg-border rounded-full">
                    <div
                        className="absolute top-0 left-0 h-2 bg-brand-accent rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${((currentPhaseIndex + 1) / loadingPhases.length) * 100}%` }}
                    ></div>
                </div>
                <p className="text-text-secondary text-sm mt-3 min-h-[20px] transition-opacity duration-300" role="status" aria-live="polite">{currentSubPhase}</p>
                <p className="text-xs text-text-secondary/70 mt-4">This may take up to a minute. The AI is performing multiple complex steps, including live database searches and synthesis.</p>
            </div>
        </div>
    );
};