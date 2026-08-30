import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { relevanceBandChrome } from '../lib/relevanceScore';

const ScoreRingSvg: React.FC<{
  score: number;
  ringColor: string;
  circumference: number;
  offset: number;
}> = ({ score, ringColor, circumference, offset }) => (
  <svg
    className="absolute top-0 left-0 h-full w-full overflow-visible"
    viewBox="0 0 40 40"
    aria-hidden="true"
  >
    <defs>
      <filter id={`glow-${score}`} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <circle
      className="text-border/30 stroke-current"
      strokeWidth="3"
      fill="transparent"
      r="18"
      cx="20"
      cy="20"
    />
    <circle
      className="transform -rotate-90 origin-center transition-all duration-1000 ease-out"
      stroke={ringColor}
      strokeWidth="3"
      strokeDasharray={circumference}
      strokeDashoffset={offset}
      strokeLinecap="round"
      fill="transparent"
      r="18"
      cx="20"
      cy="20"
      style={{ filter: `url(#glow-${score}) drop-shadow(0 0 2px ${ringColor})` }}
    />
  </svg>
);

export const RelevanceScoreDisplay: React.FC<{ score: number }> = ({ score }) => {
  const { t } = useTranslation();
  const { textClass: scoreColor, ringColor } = relevanceBandChrome(score);
  const circumference = 2 * Math.PI * 18;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div
      role="img"
      aria-label={t('report.relevance.aria', { score })}
      className="relative h-12 w-12 flex-shrink-0 flex items-center justify-center group"
    >
      <ScoreRingSvg
        score={score}
        ringColor={ringColor}
        circumference={circumference}
        offset={offset}
      />
      <span className={`text-sm font-bold ${scoreColor} drop-shadow-md`}>{score}</span>
    </div>
  );
};
