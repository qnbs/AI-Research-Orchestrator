import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AgentTraceEvent, AgentPipelineTrace, AgentStatus } from '../../types';
import { AGENT_ICONS, STATUS_DOT, STATUS_RING, STATUS_TEXT, TOKEN_BUDGET } from './constants';

export const StatusDot: React.FC<{ status: AgentStatus }> = ({ status }) => (
  <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[status]}`} />
);

export const TokenBudgetBar: React.FC<{
  used: number;
  cost: number;
  durationSec: number | null;
  isRunning: boolean;
}> = ({ used, cost, durationSec, isRunning }) => {
  const pct = Math.min((used / TOKEN_BUDGET) * 100, 100);
  const gradientClass =
    pct < 30
      ? 'from-accent-green to-brand-accent'
      : pct < 70
        ? 'from-brand-accent to-accent-cyan'
        : 'from-accent-amber to-red-400';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px] font-mono">
        <span className="text-text-secondary">
          <span className="text-text-primary font-semibold">{used.toLocaleString()}</span> /{' '}
          {TOKEN_BUDGET.toLocaleString()} tokens
        </span>
        <div className="flex items-center gap-3 text-text-secondary">
          <span className="text-accent-amber">${cost.toFixed(5)}</span>
          {durationSec !== null && <span>⏱ {durationSec.toFixed(1)}s</span>}
          <span
            className={`font-medium ${
              pct < 30 ? 'text-accent-green' : pct < 70 ? 'text-brand-accent' : 'text-accent-amber'
            }`}
          >
            {pct.toFixed(1)}%
          </span>
        </div>
      </div>
      <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${gradientClass}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{
            duration: isRunning ? 30 : 0.8,
            ease: isRunning ? 'linear' : 'easeOut',
          }}
        />
      </div>
    </div>
  );
};

export const EventRow: React.FC<{
  event: AgentTraceEvent;
  index: number;
  isLast: boolean;
}> = ({ event, index, isLast }) => {
  const [expanded, setExpanded] = useState(false);
  const dur =
    event.durationMs != null
      ? event.durationMs < 1000
        ? `${event.durationMs}ms`
        : `${(event.durationMs / 1000).toFixed(1)}s`
      : null;
  const hasDetails = !!(event.inputSummary || event.outputSummary || event.error);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, delay: Math.min(index * 0.04, 0.3) }}
      className="flex gap-3"
    >
      <div className="flex flex-col items-center flex-shrink-0 w-9">
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center text-base z-10 flex-shrink-0 transition-all duration-300 ${STATUS_RING[event.status]}`}
        >
          {AGENT_ICONS[event.agentName] ?? '⚙️'}
        </div>
        {!isLast && (
          <motion.div
            className="w-px flex-1 min-h-3 bg-border mt-1"
            initial={{ scaleY: 0, originY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.3, delay: index * 0.04 + 0.15 }}
          />
        )}
      </div>

      <div className="flex-1 min-w-0 pb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-semibold ${STATUS_TEXT[event.status]}`}>
            {event.agentName}
          </span>
          <StatusDot status={event.status} />
          <span className="text-[10px] capitalize text-text-secondary bg-surface/80 px-1.5 py-0.5 rounded-md border border-border/60">
            {event.status}
          </span>
          {dur && <span className="ml-auto text-[11px] text-accent-cyan font-mono">{dur}</span>}
        </div>

        <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{event.message}</p>

        {event.tokenUsage && (
          <div className="mt-1.5 flex items-center gap-3 text-[10px] font-mono text-text-secondary">
            <span>↑ {event.tokenUsage.inputTokens.toLocaleString()} in</span>
            <span>↓ {event.tokenUsage.outputTokens.toLocaleString()} out</span>
            <span className="text-accent-amber">
              ${event.tokenUsage.estimatedCostUsd.toFixed(5)}
            </span>
          </div>
        )}

        {hasDetails && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="flex items-center gap-1 text-[10px] text-brand-accent/80 hover:text-brand-accent mt-1 transition-colors"
          >
            <motion.span
              animate={{ rotate: expanded ? 90 : 0 }}
              transition={{ duration: 0.18 }}
              className="inline-block"
            >
              ▶
            </motion.span>
            {expanded ? 'Hide' : 'Show'} details
          </button>
        )}

        <AnimatePresence>
          {expanded && hasDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div className="mt-1.5 space-y-1.5 text-[10px]">
                {event.inputSummary && (
                  <div className="bg-surface/50 rounded-lg p-2 border border-border/50">
                    <span className="text-text-secondary font-semibold uppercase tracking-wide block mb-0.5">
                      Input
                    </span>
                    <span className="text-text-primary font-mono whitespace-pre-wrap break-words">
                      {event.inputSummary}
                    </span>
                  </div>
                )}
                {event.outputSummary && (
                  <div className="bg-surface/50 rounded-lg p-2 border border-border/50">
                    <span className="text-text-secondary font-semibold uppercase tracking-wide block mb-0.5">
                      Output
                    </span>
                    <span className="text-text-primary font-mono whitespace-pre-wrap break-words">
                      {event.outputSummary}
                    </span>
                  </div>
                )}
                {event.error && (
                  <div className="bg-red-400/10 rounded-lg p-2 border border-red-400/30">
                    <span className="text-red-400 font-mono break-words">{event.error}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export const HistoryRow: React.FC<{
  trace: AgentPipelineTrace;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ trace, index, isSelected, onSelect }) => {
  const dur =
    trace.completedAt && trace.startedAt
      ? ((trace.completedAt - trace.startedAt) / 1000).toFixed(1) + 's'
      : '–';
  const date = new Date(trace.startedAt).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      onClick={onSelect}
      className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors border ${
        isSelected
          ? 'bg-brand-accent/10 border-brand-accent/30'
          : 'hover:bg-surface-hover border-transparent'
      }`}
    >
      <div className="flex items-center gap-2">
        <StatusDot
          status={trace.status === 'done' ? 'done' : trace.status === 'error' ? 'error' : 'running'}
        />
        <span className="text-xs font-medium text-text-primary truncate flex-1">{trace.topic}</span>
        <span className="text-[10px] text-text-secondary flex-shrink-0">{date}</span>
      </div>
      <div className="flex gap-3 mt-0.5 text-[10px] font-mono text-text-secondary">
        <span>🪙 {trace.totalTokens.toLocaleString()}</span>
        <span>💵 ${trace.totalCostUsd.toFixed(4)}</span>
        <span>⏱ {dur}</span>
        <span className="ml-auto">{trace.events.length} steps</span>
      </div>
    </motion.button>
  );
};
