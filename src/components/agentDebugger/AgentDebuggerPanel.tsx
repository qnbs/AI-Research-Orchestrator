/**
 * Agent Debugger panel — live pipeline trace & token-budget visualizer.
 */
import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { togglePinned, clearHistory, setDebuggerVisible } from '../../store/slices/agentDebugSlice';
import { TokenBudgetBar } from './TokenBudgetBar';
import { EventRow } from './EventRow';
import { HistoryRow } from './HistoryRow';

const AgentDebuggerPanel: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isVisible, currentTrace, history, isPinned } = useAppSelector((s) => s.agentDebug);
  const [activeTab, setActiveTab] = useState<'trace' | 'history'>('trace');
  const [selectedHistory, setSelectedHistory] = useState<number | null>(null);

  const handleClose = useCallback(() => dispatch(setDebuggerVisible(false)), [dispatch]);
  const handlePin = useCallback(() => dispatch(togglePinned()), [dispatch]);
  const handleClearHistory = useCallback(() => {
    dispatch(clearHistory());
    setSelectedHistory(null);
  }, [dispatch]);

  useEffect(() => {
    if (!isVisible || isPinned) return;
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [isVisible, isPinned, handleClose]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- auto-switches to the trace tab when a new run starts; activeTab remains independently user-controlled afterward, so this can't be a pure render derivation.
    if (currentTrace?.status === 'running') setActiveTab('trace');
  }, [currentTrace?.sessionId, currentTrace?.status]);

  if (!isVisible) return null;

  const displayTrace =
    activeTab === 'history' && selectedHistory !== null ? history[selectedHistory] : currentTrace;

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

        <motion.div
          key="agent-debugger"
          role="dialog"
          aria-modal="true"
          aria-label="Agent Debugger"
          initial={isPinned ? { opacity: 0, x: 40 } : { opacity: 0, scale: 0.94, y: 18 }}
          animate={isPinned ? { opacity: 1, x: 0 } : { opacity: 1, scale: 1, y: 0 }}
          exit={isPinned ? { opacity: 0, x: 40 } : { opacity: 0, scale: 0.94, y: 18 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          className={`${panelCls} flex flex-col glass-elevated rounded-2xl overflow-hidden`}
          style={{
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-base select-none">🐛</span>
              <span className="text-sm font-semibold text-text-primary">Agent Debugger</span>
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

          <div className="flex border-b border-border flex-shrink-0 px-4 bg-surface/20">
            {(['trace', 'history'] as const).map((tab) => (
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

          <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin">
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
                          i === currentTrace.events.length - 1 && currentTrace.status !== 'running'
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
                          onSelect={() => setSelectedHistory((s) => (s === i ? null : i))}
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
                            isLast={i === history[selectedHistory].events.length - 1}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

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

export default AgentDebuggerPanel;
