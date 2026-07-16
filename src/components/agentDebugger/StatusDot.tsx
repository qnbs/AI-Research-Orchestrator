import React from 'react';
import type { AgentStatus } from '../../types';

export const StatusDot: React.FC<{ status: AgentStatus }> = ({ status }) => {
  const cls: Record<AgentStatus, string> = {
    idle: 'bg-text-secondary/40',
    running: 'bg-brand-accent animate-pulse',
    done: 'bg-accent-green',
    error: 'bg-red-400',
    skipped: 'bg-accent-amber opacity-60',
  };
  return <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${cls[status]}`} />;
};
