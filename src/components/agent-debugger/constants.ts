import type { AgentStatus } from '../../types';

/** Reference budget = Gemini Flash recommended session limit */
export const TOKEN_BUDGET = 1_000_000;

export const AGENT_ICONS: Record<string, string> = {
  QueryGenerator: '🧠',
  PubMedFetcher: '🔬',
  ArxivFetcher: '📡',
  Ranker: '⚡',
  Synthesizer: '✨',
  ResearchAnalyst: '🔭',
};

export const STATUS_RING: Record<AgentStatus, string> = {
  idle: 'bg-border/60',
  running: 'bg-brand-accent/20 ring-2 ring-brand-accent/60',
  done: 'bg-accent-green/15 ring-1 ring-accent-green/40',
  error: 'bg-red-400/15 ring-1 ring-red-400/40',
  skipped: 'bg-accent-amber/10 ring-1 ring-accent-amber/30',
};

export const STATUS_TEXT: Record<AgentStatus, string> = {
  idle: 'text-text-secondary',
  running: 'text-brand-accent',
  done: 'text-accent-green',
  error: 'text-red-400',
  skipped: 'text-accent-amber',
};

export const STATUS_DOT: Record<AgentStatus, string> = {
  idle: 'bg-text-secondary/40',
  running: 'bg-brand-accent animate-pulse',
  done: 'bg-accent-green',
  error: 'bg-red-400',
  skipped: 'bg-accent-amber opacity-60',
};
