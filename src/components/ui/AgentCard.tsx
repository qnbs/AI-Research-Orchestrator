/**
 * AgentCard — Cybernetic glassmorphism card for an AI pipeline agent.
 *
 * Features:
 *  • backdrop-blur-2xl glass surface with theme-aware CSS variables
 *  • Status-keyed left border + neon-cyan glow when running
 *  • Framer Motion layout + spring enter/exit + hover lift
 *  • Optional token usage micro-bar + duration chip
 *  • Composable: accepts children for custom content
 */
import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AgentName, AgentStatus } from '../../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<AgentStatus, string> = {
  idle:    'Idle',
  running: 'Running',
  done:    'Done',
  error:   'Error',
  skipped: 'Skipped',
};

const STATUS_DOT_COLORS: Record<AgentStatus, string> = {
  idle:    'bg-text-secondary',
  running: 'bg-brand-accent',
  done:    'bg-accent-green',
  error:   'bg-red-400',
  skipped: 'bg-border',
};

const AGENT_ICONS: Record<AgentName, string> = {
  QueryGenerator:  '🔍',
  PubMedFetcher:   '📚',
  ArxivFetcher:    '📡',
  Ranker:          '⚡',
  Synthesizer:     '🧬',
  ResearchAnalyst: '🔬',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatusDot: React.FC<{ status: AgentStatus }> = ({ status }) => (
  <span
    className={`inline-block w-2 h-2 rounded-full ${STATUS_DOT_COLORS[status]} ${
      status === 'running' ? 'animate-pulse shadow-glow' : ''
    }`}
  />
);

const TokenBar: React.FC<{ tokensIn?: number; tokensOut?: number }> = ({
  tokensIn = 0,
  tokensOut = 0,
}) => {
  const total = tokensIn + tokensOut;
  if (total === 0) return null;
  const inPct = Math.round((tokensIn / total) * 100);
  return (
    <div className="mt-3 space-y-1">
      <div className="flex justify-between text-[10px] text-text-secondary font-mono">
        <span>in {tokensIn.toLocaleString()}</span>
        <span>{total.toLocaleString()} total</span>
        <span>out {tokensOut.toLocaleString()}</span>
      </div>
      <div className="h-1.5 w-full rounded-full overflow-hidden bg-border/50">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-accent to-accent-cyan"
          style={{ width: `${inPct}%` }}
        />
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export interface AgentCardMetrics {
  tokensIn?: number;
  tokensOut?: number;
  durationMs?: number;
  cost?: number;
}

export interface AgentCardProps {
  agentName: AgentName;
  status: AgentStatus;
  description?: string;
  metrics?: AgentCardMetrics;
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  /** Framer Motion stagger index for list animations */
  index?: number;
}

const AgentCardInner: React.FC<AgentCardProps> = ({
  agentName,
  status,
  description,
  metrics,
  children,
  className = '',
  onClick,
  index = 0,
}) => {
  const isRunning = status === 'running';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, y: -8 }}
      transition={{
        type: 'spring',
        stiffness: 380,
        damping: 28,
        delay: index * 0.06,
      }}
      whileHover={onClick ? { y: -3, scale: 1.015 } : undefined}
      className={`agent-card agent-card--${status} p-4 cursor-${onClick ? 'pointer' : 'default'} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {/* Running scanline shimmer */}
      <AnimatePresence>
        {isRunning && (
          <motion.div
            key="shimmer"
            className="absolute inset-0 pointer-events-none rounded-xl overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-y-0 w-1/3"
              style={{
                background:
                  'linear-gradient(90deg, transparent, rgba(56,189,248,0.06), transparent)',
              }}
              animate={{ x: ['-100%', '400%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header row */}
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className="text-xl select-none"
            aria-hidden="true"
          >
            {AGENT_ICONS[agentName] ?? '🤖'}
          </span>
          <div>
            <p className="text-sm font-semibold text-text-primary leading-tight">
              {agentName}
            </p>
            {description && (
              <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Status badge */}
        <div className="agent-badge agent-badge--active flex-shrink-0 gap-1.5">
          <StatusDot status={status} />
          <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
            {STATUS_LABELS[status]}
          </span>
        </div>
      </div>

      {/* Metrics row */}
      {metrics && (
        <div className="relative mt-3 flex items-center gap-3 flex-wrap">
          {metrics.durationMs !== undefined && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-text-secondary bg-background/40 px-2 py-0.5 rounded">
              ⏱ {(metrics.durationMs / 1000).toFixed(2)}s
            </span>
          )}
          {metrics.cost !== undefined && metrics.cost > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-accent-amber bg-background/40 px-2 py-0.5 rounded">
              $ {metrics.cost.toFixed(5)}
            </span>
          )}
        </div>
      )}

      {/* Token bar */}
      {metrics && (
        <TokenBar
          tokensIn={metrics.tokensIn}
          tokensOut={metrics.tokensOut}
        />
      )}

      {/* Custom content */}
      {children && <div className="relative mt-3">{children}</div>}
    </motion.div>
  );
};

export const AgentCard = memo(AgentCardInner);
