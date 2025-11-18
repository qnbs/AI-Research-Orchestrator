import React, { useState, useEffect, useRef } from 'react';

interface LoadingIndicatorProps {
  title: string;
  phase: string;
  phases: readonly string[];
  phaseDetails: Record<string, string[]>;
  footerText?: string;
}

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


export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ title, phase, phases, phaseDetails, footerText }) => {
    const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
    const [currentSubPhase, setCurrentSubPhase] = useState('');
    const subPhaseIntervalRef = useRef<number | null>(null);

    useEffect(() => {
        const index = phases.findIndex(p => p === phase);
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

    }, [phase, phases, phaseDetails]);

    return (
        <div className="flex flex-col items-center justify-center text-center p-8 bg-surface/50 rounded-lg border border-border">
            <CyberneticSpinner />
            <h2 className="text-xl font-semibold brand-gradient-text mt-6 mb-2">{title}</h2>
            <div className="w-full max-w-2xl mx-auto mt-4 overflow-hidden text-center">
                 <p className="text-text-primary text-base font-semibold mb-2" role="status" aria-live="polite">{phase}</p>
                <div className="relative h-2 bg-border rounded-full">
                    <div
                        className="absolute top-0 left-0 h-2 bg-brand-accent rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${((currentPhaseIndex + 1) / phases.length) * 100}%` }}
                    ></div>
                </div>
                <p className="text-text-secondary text-sm mt-3 min-h-[20px] transition-opacity duration-300" role="status" aria-live="polite">{currentSubPhase}</p>
                {footerText && <p className="text-xs text-text-secondary/70 mt-4">{footerText}</p>}
            </div>
        </div>
    );
};
