import { describe, it, expect } from 'vitest';
import agentDebugReducer, {
  startNewTrace,
  addTraceEvent,
  completeTrace,
  setDebuggerVisible,
} from './agentDebugSlice';

describe('agentDebugSlice', () => {
  it('startNewTrace seeds running trace', () => {
    const s = agentDebugReducer(undefined, startNewTrace({ sessionId: 's', topic: 't' }));
    expect(s.currentTrace?.sessionId).toBe('s');
    expect(s.currentTrace?.status).toBe('running');
  });

  it('addTraceEvent appends', () => {
    let s = agentDebugReducer(undefined, startNewTrace({ sessionId: 's', topic: 't' }));
    s = agentDebugReducer(
      s,
      addTraceEvent({
        agentName: 'QueryGenerator',
        status: 'running',
        message: 'm',
        startedAt: 1,
      }),
    );
    expect(s.currentTrace?.events.length).toBe(1);
  });

  it('completeTrace archives', () => {
    let s = agentDebugReducer(undefined, startNewTrace({ sessionId: 's', topic: 't' }));
    s = agentDebugReducer(s, completeTrace({ status: 'done' }));
    expect(s.currentTrace?.status).toBe('done');
    expect(s.history.length).toBe(1);
  });

  it('setDebuggerVisible', () => {
    const s = agentDebugReducer(undefined, setDebuggerVisible(true));
    expect(s.isVisible).toBe(true);
  });
});
