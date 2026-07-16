import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AgentTraceEvent } from '../../types';
import { AGENT_ICONS, STATUS_RING, STATUS_TEXT } from './constants';
import { StatusDot } from './StatusDot';

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
