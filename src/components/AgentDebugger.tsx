import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { toggleDebugger, togglePinned, clearHistory } from '../store/slices/agentDebugSlice';
import type { AgentTraceEvent, AgentStatus } from '../types';

// ── Icons ─────────────────────────────────────────────────────────────────────
const StatusDot: React.FC<{ status: AgentStatus }> = ({ status }) => {
  const colors: Record<AgentStatus, string> = {
    idle: 'bg-text-secondary',
    running: 'bg-brand-accent animate-pulse',
    done: 'bg-accent-green',
    error: 'bg-red-400',
    skipped: 'bg-accent-amber opacity-50',
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status]}`} />;
};

const AgentIcon: Record<string, string> = {
  QueryGenerator: '🧠',
  PubMedFetcher: '🔬',
  ArxivFetcher: '📡',
  Ranker: '⚡',
  Synthesizer: '✨',
  ResearchAnalyst: '🔭',
};

// ── Token Cost Bar ─────────────────────────────────────────────────────────────
const TokenBar: React.FC<{ used: number; total: number }> = ({ used, total }) => {
  if (!total) return null;
  const pct = Math.min((used / total) * 100, 100);
  return (
    <div className="w-full h-1 bg-border rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-gradient-to-r from-brand-accent to-accent-cyan"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
    </div>
  );
};

// ── Single Event Row ──────────────────────────────────────────────────────────
const EventRow: React.FC<{ event: AgentTraceEvent; index: number }> = ({ event, index }) => {
  const durationLabel = event.durationMs != null
    ? event.durationMs < 1000
      ? `${event.durationMs}ms`
      : `${(event.durationMs / 1000).toFixed(1)}s`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="timeline-step"
    >
      {/* Connector dot */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full glass-panel flex items-center justify-center text-base z-10">
        {AgentIcon[event.agentName] ?? '⚙️'}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-text-primary">{event.agentName}</span>
          <StatusDot status={event.status} />
          <span className="text-xs text-text-secondary capitalize">{event.status}</span>
          {durationLabel && (
            <span className="ml-auto text-xs text-accent-cyan font-mono">{durationLabel}</span>
          )}
        </div>

        <p className="text-xs text-text-secondary mt-0.5 truncate">{event.message}</p>

        {event.tokenUsage && (
          <div className="mt-1.5 space-y-1">
            <div className="flex justify-between text-[10px] text-text-secondary font-mono">
              <span>↑ {event.tokenUsage.inputTokens.toLocaleString()} in</span>
              <span>↓ {event.tokenUsage.outputTokens.toLocaleString()} out</span>
              <span className="text-accent-amber">${event.tokenUsage.estimatedCostUsd.toFixed(5)}</span>
            </div>
            <TokenBar used={event.tokenUsage.totalTokens} total={event.tokenUsage.totalTokens * 1.2} />
          </div>
        )}

        {event.error && (
          <p className="text-xs text-red-400 mt-1 font-mono">{event.error}</p>
        )}
      </div>
    </motion.div>
  );
};

// ── Main Debugger Panel ───────────────────────────────────────────────────────
const AgentDebugger: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isVisible, currentTrace, history, isPinned } = useAppSelector(s => s.agentDebug);
  const settingsTheme = useAppSelector(s => s.settings.data?.theme ?? 'dark');

  const handleClose = useCallback(() => dispatch(toggleDebugger()), [dispatch]);
  const handlePin = useCallback(() => dispatch(togglePinned()), [dispatch]);
  const handleClearHistory = useCallback(() => dispatch(clearHistory()), [dispatch]);

  if (!isVisible) return null;

  const trace = currentTrace;
  const totalDuration = trace?.completedAt && trace.startedAt
    ? ((trace.completedAt - trace.startedAt) / 1000).toFixed(1)
    : null;

  return (
    <AnimatePresence>
      <motion.div
        key="agent-debugger"
        initial={{ opacity: 0, x: 320 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 320 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={`fixed right-4 z-50 w-80 max-h-[85vh] flex flex-col glass-panel rounded-xl overflow-hidden
          ${isPinned ? 'top-16' : 'top-20'}`}
        style={{ boxShadow: '0 0 30px rgba(56,189,248,0.15), var(--shadow-lg)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-text-primary">Agent Debugger</span>
            {trace?.status === 'running' && (
              <span className="agent-badge agent-badge--active">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" />
                Live
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handlePin}
              title={isPinned ? 'Unpin' : 'Pin to top'}
              className={`p-1.5 rounded-md text-xs transition-colors ${isPinned ? 'text-brand-accent bg-brand-accent/10' : 'text-text-secondary hover:text-text-primary'}`}
              aria-pressed={isPinned}
            >
              📌
            </button>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-md text-text-secondary hover:text-text-primary transition-colors"
              aria-label="Close debugger"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Session Summary */}
        {trace && (
          <div className="px-4 py-2.5 border-b border-border bg-surface/50 flex-shrink-0">
            <p className="text-xs font-medium text-text-primary truncate" title={trace.topic}>
              {trace.topic}
            </p>
            <div className="flex items-center gap-3 mt-1 text-[11px] text-text-secondary font-mono">
              <span>🪙 {trace.totalTokens.toLocaleString()} tokens</span>
              <span>💵 ${trace.totalCostUsd.toFixed(5)}</span>
              {totalDuration && <span>⏱ {totalDuration}s</span>}
            </div>
            {trace.totalTokens > 0 && (
              <div className="mt-1.5 w-full h-1 bg-border rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-accent-magenta to-brand-accent"
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: trace.status === 'running' ? 30 : 0.5, ease: 'linear' }}
                />
              </div>
            )}
          </div>
        )}

        {/* Events Timeline */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1 min-h-0">
          {!trace?.events.length && (
            <div className="text-center text-text-secondary text-xs py-8">
              <p className="text-2xl mb-2">🔍</p>
              <p>Start a research session to see the agent pipeline live.</p>
            </div>
          )}
          {trace?.events.map((event, i) => (
            <EventRow key={event.id} event={event} index={i} />
          ))}
          {trace?.status === 'running' && (
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="flex items-center gap-2 text-xs text-brand-accent pl-10 py-1"
            >
              <span className="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
              Processing...
            </motion.div>
          )}
        </div>

        {/* History Footer */}
        {history.length > 0 && (
          <div className="px-4 py-2 border-t border-border flex items-center justify-between flex-shrink-0">
            <span className="text-xs text-text-secondary">{history.length} session{history.length > 1 ? 's' : ''} in history</span>
            <button
              onClick={handleClearHistory}
              className="text-xs text-text-secondary hover:text-red-400 transition-colors"
            >
              Clear
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default AgentDebugger;

// ── Trigger Button (to mount in Header) ───────────────────────────────────────
export const AgentDebuggerToggle: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isVisible, currentTrace } = useAppSelector(s => s.agentDebug);
  const isRunning = currentTrace?.status === 'running';

  return (
    <motion.button
      onClick={() => dispatch(toggleDebugger())}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`relative p-2 rounded-lg transition-colors text-sm font-mono
        ${isVisible ? 'bg-brand-accent/10 text-brand-accent border border-brand-accent/30' : 'text-text-secondary hover:text-text-primary glass-panel'}`}
      title="Toggle Agent Debugger"
      aria-pressed={isVisible}
    >
      🐛
      {isRunning && (
        <motion.span
          className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-brand-accent"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
    </motion.button>
  );
};
