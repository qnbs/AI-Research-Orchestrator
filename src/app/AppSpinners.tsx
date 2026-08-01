import React from 'react';

interface SpinnerProps {
  /** Accessible status label (visually hidden). */
  label?: string;
}

export const FullScreenSpinner: React.FC<SpinnerProps> = ({ label = 'Loading' }) => (
  <div
    className="flex h-screen items-center justify-center bg-background"
    role="status"
    aria-live="polite"
  >
    <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-brand-accent" />
    <span className="sr-only">{label}</span>
  </div>
);

export const ContentSpinner: React.FC<SpinnerProps> = ({ label = 'Loading' }) => (
  <div
    className="flex h-full min-h-[60vh] items-center justify-center"
    role="status"
    aria-live="polite"
  >
    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-brand-accent" />
    <span className="sr-only">{label}</span>
  </div>
);
