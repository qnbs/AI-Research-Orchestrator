import { describe, it, expect } from 'vitest';
import agentDebugReducer, {
  startNewTrace,
  addTraceEvent,
  updateTraceEvent,
  completeTrace,
  setDebuggerVisible,
  toggleDebugger,
  togglePinned,
  clearHistory,
  setAgentStatus,
} from './agentDebugSlice';

describe('agentDebugSlice', () => {
  it('startNewTrace seeds running trace', () => {
    const s = agentDebugReducer(undefined, startNewTrace({ sessionId: 's', topic: 't' }));
    expect(s.currentTrace?.sessionId).toBe('s');
    expect(s.currentTrace?.status).toBe('running');
  });

  it('addTraceEvent appends and accumulates tokens', () => {
    let s = agentDebugReducer(undefined, startNewTrace({ sessionId: 's', topic: 't' }));
    s = agentDebugReducer(
      s,
      addTraceEvent({
        agentName: 'QueryGenerator',
        status: 'running',
        message: 'm',
        startedAt: 1,
        tokenUsage: { inputTokens: 1, outputTokens: 2, totalTokens: 3, estimatedCostUsd: 0.01 },
      }),
    );
    expect(s.currentTrace?.events.length).toBe(1);
    expect(s.currentTrace?.totalTokens).toBe(3);
    expect(s.currentTrace?.totalCostUsd).toBe(0.01);
  });

  it('addTraceEvent no-ops without currentTrace', () => {
    const s = agentDebugReducer(
      undefined,
      addTraceEvent({
        agentName: 'QueryGenerator',
        status: 'running',
        message: 'm',
        startedAt: 1,
      }),
    );
    expect(s.currentTrace).toBeNull();
  });

  it('updateTraceEvent merges duration and tokens', () => {
    let s = agentDebugReducer(undefined, startNewTrace({ sessionId: 's', topic: 't' }));
    s = agentDebugReducer(
      s,
      addTraceEvent({
        agentName: 'Ranker',
        status: 'running',
        message: 'm',
        startedAt: 100,
      }),
    );
    const id = s.currentTrace!.events[0].id;
    s = agentDebugReducer(
      s,
      updateTraceEvent({
        id,
        updates: {
          status: 'done',
          completedAt: 250,
          tokenUsage: {
            inputTokens: 5,
            outputTokens: 5,
            totalTokens: 10,
            estimatedCostUsd: 0.02,
          },
        },
      }),
    );
    expect(s.currentTrace!.events[0].durationMs).toBe(150);
    expect(s.currentTrace!.totalTokens).toBe(10);
  });

  it('completeTrace archives', () => {
    let s = agentDebugReducer(undefined, startNewTrace({ sessionId: 's', topic: 't' }));
    s = agentDebugReducer(s, completeTrace({ status: 'done' }));
    expect(s.currentTrace?.status).toBe('done');
    expect(s.history.length).toBe(1);
  });

  it('setDebuggerVisible / toggleDebugger / togglePinned / clearHistory', () => {
    let s = agentDebugReducer(undefined, setDebuggerVisible(true));
    expect(s.isVisible).toBe(true);
    s = agentDebugReducer(s, toggleDebugger());
    expect(s.isVisible).toBe(false);
    s = agentDebugReducer(s, togglePinned());
    expect(s.isPinned).toBe(true);
    s = agentDebugReducer(s, startNewTrace({ sessionId: 's', topic: 't' }));
    s = agentDebugReducer(s, completeTrace({ status: 'done' }));
    s = agentDebugReducer(s, clearHistory());
    expect(s.history).toEqual([]);
  });

  it('setAgentStatus updates last event for agent', () => {
    let s = agentDebugReducer(undefined, startNewTrace({ sessionId: 's', topic: 't' }));
    s = agentDebugReducer(
      s,
      addTraceEvent({
        agentName: 'Synthesizer',
        status: 'running',
        message: 'go',
        startedAt: 10,
      }),
    );
    s = agentDebugReducer(
      s,
      setAgentStatus({ agentName: 'Synthesizer', status: 'done', message: 'ok' }),
    );
    expect(s.currentTrace!.events[0].status).toBe('done');
    expect(s.currentTrace!.events[0].message).toBe('ok');
    expect(s.currentTrace!.events[0].completedAt).toBeDefined();
  });
});
