
import React from 'react';

export const RelevanceScoreDisplay: React.FC<{ score: number }> = ({ score }) => {
    const scoreColor = score > 75 ? 'text-green-400' : score > 50 ? 'text-amber-400' : 'text-red-400';
    const ringColor = score > 75 ? '#4ade80' : score > 50 ? '#fbbf24' : '#f87171';
    const circumference = 2 * Math.PI * 18; // 2 * pi * r
    const offset = circumference - (score / 100) * circumference;

    return (
        <div role="img" aria-label={`Relevance Score: ${score} out of 100`} className="relative h-12 w-12 flex-shrink-0 flex items-center justify-center group">
            <svg className="absolute top-0 left-0 h-full w-full overflow-visible" viewBox="0 0 40 40" aria-hidden="true">
                {/* Define filter for neon glow */}
                <defs>
                    <filter id={`glow-${score}`} x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                
                {/* Background Track */}
                <circle className="text-border/30 stroke-current" strokeWidth="3" fill="transparent" r="18" cx="20" cy="20" />
                
                {/* Progress Ring with Glow */}
                <circle
                    className="transform -rotate-90 origin-center transition-all duration-1000 ease-out"
                    stroke={ringColor}
                    strokeWidth="3" 
                    strokeDasharray={circumference} 
                    strokeDashoffset={offset}
                    strokeLinecap="round" 
                    fill="transparent" 
                    r="18" cx="20" cy="20"
                    style={{ filter: `url(#glow-${score}) drop-shadow(0 0 2px ${ringColor})` }}
                />
            </svg>
            <span className={`text-sm font-bold ${scoreColor} drop-shadow-md`}>{score}</span>
        </div>
    );
};
