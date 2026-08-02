import React from 'react';
import { AppLogo } from '../components/AppLogo';

interface SpinnerProps {
  /** Accessible status label (visually hidden). */
  label?: string;
}

export const FullScreenSpinner: React.FC<SpinnerProps> = ({ label = 'Loading' }) => (
  <div
    className="flex h-screen flex-col items-center justify-center gap-4 bg-background"
    role="status"
    aria-live="polite"
  >
    <AppLogo className="h-20 w-20 animate-pulse" aria-label={label} />
    <span className="sr-only">{label}</span>
  </div>
);

export const ContentSpinner: React.FC<SpinnerProps> = ({ label = 'Loading' }) => (
  <div
    className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-3"
    role="status"
    aria-live="polite"
  >
    <AppLogo className="h-14 w-14 animate-pulse" aria-label={label} />
    <span className="sr-only">{label}</span>
  </div>
);
