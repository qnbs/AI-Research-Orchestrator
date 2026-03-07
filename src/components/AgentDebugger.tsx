/**
 * Agent Debugger Modal — Live Pipeline Trace & Token-Budget Visualizer
 *
 * Features:
 *  - Full modal (centered) or pinned side-panel
 *  - Token-budget progress bar with cost & duration
 *  - Step-by-step timeline with connecting spines
 *  - Expandable event rows (input / output / metadata summaries)
 *  - History tab to browse past sessions w/ detail drill-down
 *  - Keyboard: Escape to close when unpinned
 */
import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  toggleDebugger,
  togglePinned,
  clearHistory,
  setDebuggerVisible,
} from '../store/slices/agentDebugSlice';
import type { AgentTraceEvent, AgentPipelineTrace, AgentStatus } from '../types';

// ── Constants ─────────────────────────────────────────────────────────────────
/** Reference budget = Gemini Flash recommended session limit */
const TOKEN_BUDGET = 1_000_000;

const AGENT_ICONS: Record<string, string> = {
  QueryGenerator: '🧠',
  PubMedFetcher: '🔬',
  ArxivFetcher: '📡',
  Ranker: '⚡',
  Synthesizer: '✨',
  ResearchAnalyst: '🔭',
};

const STATUS_RING: Record<AgentStatus, string> = {
  idle: 'bg-border/60',
  running: 'bg-brand-accent/20 ring-2 ring-brand-accent/60',
  done: 'bg-accent-green/15 ring-1 ring-accent-green/40',
  error: 'bg-red-400/15 ring-1 ring-red-400/40',
  skipped: 'bg-accent-amber/10 ring-1 ring-accent-amber/30',
};

const STATUS_TEXT: Record<AgentStatus, string> = {
  idle: 'text-text-secondary',
  running: 'text-brand-accent',
  done: 'text-accent-green',
  error: 'text-red-400',
  skipped: 'text-accent-amber',
};

// ── Sub-components ─────────────────────────────────────────────────────────────

const StatusDot: React.FC<{ status: AgentStatus }> = ({ status }) => {
  const cls: Record<AgentStatus, string> = {
    idle: 'bg-text-secondary/40',
    running: 'bg-brand-accent animate-pulse',
    done: 'bg-accent-green',
    error: 'bg-red-400',
    skipped: 'bg-accent-amber opacity-60',
  };
  return <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${cls[status]}`} />;
};

const TokenBudgetBar: React.FC<{
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
          <span className="text-text-primary font-semibold">{used.toLocaleString()}</span>
          {' '}/{' '}{TOKEN_BUDGET.toLocaleString()} tokens
        </span>
        <div className="flex items-center gap-3 text-text-secondary">
          <span className="text-accent-amber">${cost.toFixed(5)}</span>
          {durationSec !== null && <span>⏱ {durationSec.toFixed(1)}s</span>}
          <span
            className={`font-medium ${
              pct < 30
                ? 'text-accent-green'
                : pct < 70
                ? 'text-brand-accent'
                : 'text-accent-amber'
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

const EventRow: React.FC<{
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
      {/* Spine */}
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

      {/* Content */}
      <div className="flex-1 min-w-0 pb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-semibold ${STATUS_TEXT[event.status]}`}>
            {event.agentName}
          </span>
          <StatusDot status={event.status} />
          <span className="text-[10px] capitalize text-text-secondary bg-surface/80 px-1.5 py-0.5 rounded-md border border-border/60">
            {event.status}
          </span>
          {dur && (
            <span className="ml-auto text-[11px] text-accent-cyan font-mono">{dur}</span>
          )}
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
            onClick={() => setExpanded(e => !e)}
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

const HistoryRow: React.FC<{
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
          status={
            trace.status === 'done' ? 'done' : trace.status === 'error' ? 'error' : 'running'
          }
        />
        <span className="text-xs font-medium text-text-primary truncate flex-1">
          {trace.topic}
        </span>
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

// ── Main Component ─────────────────────────────────────────────────────────────
const AgentDebugger: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isVisible, currentTrace, history, isPinned } = useAppSelector(
    s => s.agentDebug,
  );
  const [activeTab, setActiveTab] = useState<'trace' | 'history'>('trace');
  const [selectedHistory, setSelectedHistory] = useState<number | null>(null);

  const handleClose = useCallback(() => dispatch(setDebuggerVisible(false)), [dispatch]);
  const handlePin = useCallback(() => dispatch(togglePinned()), [dispatch]);
  const handleClearHistory = useCallback(() => {
    dispatch(clearHistory());
    setSelectedHistory(null);
  }, [dispatch]);

  // Esc to close (modal mode only)
  useEffect(() => {
    if (!isVisible || isPinned) return;
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [isVisible, isPinned, handleClose]);

  // Auto-switch to trace tab on new running trace
  useEffect(() => {
    if (currentTrace?.status === 'running') setActiveTab('trace');
  }, [currentTrace?.sessionId, currentTrace?.status]);

  if (!isVisible) return null;

  const displayTrace =
    activeTab === 'history' && selectedHistory !== null
      ? history[selectedHistory]
      : currentTrace;

  const totalSec =
    displayTrace?.completedAt && displayTrace.startedAt
      ? (displayTrace.completedAt - displayTrace.startedAt) / 1000
      : null;

  const panelCls = isPinned
    ? 'fixed right-4 top-16 w-80 max-h-[85vh] z-50'
    : 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-lg max-h-[80vh] z-50';

  return (
    <AnimatePresence>
      <>
        {/* Backdrop (modal mode) */}
        {!isPinned && (
          <motion.div
            key="dbg-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm"
            onClick={handleClose}
            aria-hidden="true"
          />
        )}

        {/* Panel */}
        <motion.div
          key="agent-debugger"
          role="dialog"
          aria-modal="true"
          aria-label="Agent Debugger"
          initial={
            isPinned ? { opacity: 0, x: 40 } : { opacity: 0, scale: 0.94, y: 18 }
          }
          animate={isPinned ? { opacity: 1, x: 0 } : { opacity: 1, scale: 1, y: 0 }}
          exit={
            isPinned ? { opacity: 0, x: 40 } : { opacity: 0, scale: 0.94, y: 18 }
          }
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          className={`${panelCls} flex flex-col glass-elevated rounded-2xl overflow-hidden`}
          style={{
            boxShadow:
              '0 0 40px rgba(56,189,248,0.18), 0 24px 64px rgba(0,0,0,0.35)',
          }}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-base select-none">🐛</span>
              <span className="text-sm font-semibold text-text-primary">
                Agent Debugger
              </span>
              {currentTrace?.status === 'running' && (
                <motion.span
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                  className="flex items-center gap-1 text-[10px] text-brand-accent bg-brand-accent/10 px-2 py-0.5 rounded-full border border-brand-accent/30"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-accent" />
                  Live
                </motion.span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handlePin}
                title={isPinned ? 'Expand to modal' : 'Pin as side panel'}
                className={`p-1.5 rounded-md text-xs transition-colors ${
                  isPinned
                    ? 'text-brand-accent bg-brand-accent/10'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                aria-pressed={isPinned}
              >
                📌
              </button>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-md text-text-secondary hover:text-red-400 transition-colors"
                aria-label="Close debugger"
              >
                ✕
              </button>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="flex border-b border-border flex-shrink-0 px-4 bg-surface/20">
            {(['trace', 'history'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2.5 px-3 text-xs font-medium capitalize border-b-2 -mb-px transition-colors ${
                  activeTab === tab
                    ? 'text-brand-accent border-brand-accent'
                    : 'text-text-secondary border-transparent hover:text-text-primary'
                }`}
              >
                {tab}
                {tab === 'history' && history.length > 0 && (
                  <span className="ml-1.5 text-[10px] bg-brand-accent/20 text-brand-accent px-1.5 py-0.5 rounded-full">
                    {history.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Token Budget ── */}
          {displayTrace && (
            <div className="px-4 py-3 border-b border-border bg-surface/30 flex-shrink-0">
              <p
                className="text-xs font-medium text-text-primary truncate mb-2"
                title={displayTrace.topic}
              >
                {displayTrace.topic}
              </p>
              <TokenBudgetBar
                used={displayTrace.totalTokens}
                cost={displayTrace.totalCostUsd}
                durationSec={totalSec}
                isRunning={displayTrace.status === 'running'}
              />
            </div>
          )}

          {/* ── Content ── */}
          <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin">
            {/* Trace tab */}
            {activeTab === 'trace' && (
              <div className="px-4 py-4">
                {!currentTrace?.events.length ? (
                  <div className="text-center text-text-secondary text-xs py-12">
                    <p className="text-4xl mb-3 select-none">🔍</p>
                    <p className="font-medium text-text-primary">No active trace</p>
                    <p className="mt-1 opacity-60 max-w-xs mx-auto">
                      Start a literature review to see the agent pipeline live.
                    </p>
                  </div>
                ) : (
                  <>
                    {currentTrace.events.map((ev, i) => (
                      <EventRow
                        key={ev.id}
                        event={ev}
                        index={i}
                        isLast={
                          i === currentTrace.events.length - 1 &&
                          currentTrace.status !== 'running'
                        }
                      />
                    ))}
                    {currentTrace.status === 'running' && (
                      <motion.div
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="flex items-center gap-2 text-xs text-brand-accent pl-12 py-1 mt-1"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-accent" />
                        Processing…
                      </motion.div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* History tab */}
            {activeTab === 'history' && (
              <div>
                {history.length === 0 ? (
                  <div className="text-center text-text-secondary text-xs py-12">
                    <p className="text-4xl mb-3 select-none">📜</p>
                    <p>No sessions in history yet.</p>
                  </div>
                ) : (
                  <>
                    <div className="px-3 py-2 space-y-1">
                      {history.map((t, i) => (
                        <HistoryRow
                          key={t.sessionId}
                          trace={t}
                          index={i}
                          isSelected={selectedHistory === i}
                          onSelect={() =>
                            setSelectedHistory(s => (s === i ? null : i))
                          }
                        />
                      ))}
                    </div>
                    {selectedHistory !== null && (
                      <div className="border-t border-border px-4 py-4">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary mb-3">
                          Trace Detail
                        </p>
                        {history[selectedHistory].events.map((ev, i) => (
                          <EventRow
                            key={ev.id}
                            event={ev}
                            index={i}
                            isLast={
                              i === history[selectedHistory].events.length - 1
                            }
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          {history.length > 0 && (
            <div className="px-4 py-2.5 border-t border-border flex items-center justify-between flex-shrink-0 bg-surface/30">
              <span className="text-xs text-text-secondary">
                {history.length} session{history.length !== 1 ? 's' : ''} archived
              </span>
              <button
                onClick={handleClearHistory}
                className="text-xs text-text-secondary hover:text-red-400 transition-colors"
              >
                Clear History
              </button>
            </div>
          )}
        </motion.div>
      </>
    </AnimatePresence>
  );
};

export default AgentDebugger;

// ── Toggle Button ──────────────────────────────────────────────────────────────
export const AgentDebuggerToggle: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isVisible, currentTrace } = useAppSelector(s => s.agentDebug);
  const isRunning = currentTrace?.status === 'running';

  return (
    <motion.button
      onClick={() => dispatch(toggleDebugger())}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`relative p-2 rounded-lg transition-colors text-sm ${
        isVisible
          ? 'bg-brand-accent/10 text-brand-accent border border-brand-accent/30'
          : 'text-text-secondary hover:text-text-primary glass-panel'
      }`}
      title="Agent Debugger — live pipeline trace"
      aria-pressed={isVisible}
      aria-label="Toggle Agent Debugger"
    >
      🐛
      {isRunning && (
        <motion.span
          className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-brand-accent"
          animate={{ scale: [1, 1.35, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
    </motion.button>
  );
};
