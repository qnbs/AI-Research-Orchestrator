import React from 'react';

interface LoadingIndicatorProps {
  phase: string;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ phase }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-brand-accent mb-6"></div>
      <h2 className="text-xl font-semibold text-brand-accent mb-2">Orchestrating AI Agents...</h2>
      <p className="text-text-secondary animate-pulse">{phase}</p>
    </div>
  );
};