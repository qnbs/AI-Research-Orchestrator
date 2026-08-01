import React from 'react';

export const FullScreenSpinner: React.FC = () => (
  <div className="flex h-screen items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-brand-accent"></div>
  </div>
);

export const ContentSpinner: React.FC = () => (
  <div className="flex h-full min-h-[60vh] items-center justify-center">
    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-brand-accent"></div>
  </div>
);
