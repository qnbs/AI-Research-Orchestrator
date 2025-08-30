import React from 'react';

export const RelevanceScoreDisplay: React.FC<{ score: number }> = ({ score }) => {
    const scoreColor = score > 75 ? 'text-green-400' : score > 50 ? 'text-amber-400' : 'text-red-400';
    const ringColor = score > 75 ? 'stroke-green-400' : score > 50 ? 'stroke-amber-400' : 'stroke-red-400';
    const circumference = 2 * Math.PI * 18; // 2 * pi * r
    const offset = circumference - (score / 100) * circumference;

    return (
        <div className="relative h-12 w-12 flex-shrink-0 flex items-center justify-center group" title={`Relevance Score: ${score}/100`}>
            <svg className="absolute top-0 left-0 h-full w-full" viewBox="0 0 40 40">
                <circle className="stroke-current text-border/50" strokeWidth="3" fill="transparent" r="18" cx="20" cy="20" />
                <circle
                    className={`transform -rotate-90 origin-center transition-all duration-1000 ease-out ${ringColor}`}
                    strokeWidth="3" strokeDasharray={circumference} strokeDashoffset={offset}
                    strokeLinecap="round" fill="transparent" r="18" cx="20" cy="20"
                />
            </svg>
            <span className={`text-sm font-bold ${scoreColor}`}>{score}</span>
        </div>
    );
};