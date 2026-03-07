/**
 * Agent Debugger Slice — Visual pipeline tracing with token usage
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AgentPipelineTrace, AgentTraceEvent, AgentName, AgentStatus } from '../../types';

interface AgentDebugState {
  isVisible: boolean;
  currentTrace: AgentPipelineTrace | null;
  history: AgentPipelineTrace[];
  isPinned: boolean;
}

const initialState: AgentDebugState = {
  isVisible: false,
  currentTrace: null,
  history: [],
  isPinned: false,
};

export const agentDebugSlice = createSlice({
  name: 'agentDebug',
  initialState,
  reducers: {
    toggleDebugger: (state) => {
      state.isVisible = !state.isVisible;
    },
    setDebuggerVisible: (state, action: PayloadAction<boolean>) => {
      state.isVisible = action.payload;
    },
    togglePinned: (state) => {
      state.isPinned = !state.isPinned;
    },
    startNewTrace: (state, action: PayloadAction<{ sessionId: string; topic: string }>) => {
      state.currentTrace = {
        sessionId: action.payload.sessionId,
        topic: action.payload.topic,
        startedAt: Date.now(),
        events: [],
        totalTokens: 0,
        totalCostUsd: 0,
        status: 'running',
      };
    },
    addTraceEvent: (state, action: PayloadAction<Omit<AgentTraceEvent, 'id'>>) => {
      if (!state.currentTrace) return;
      const event: AgentTraceEvent = {
        ...action.payload,
        id: `${action.payload.agentName}-${Date.now()}`,
      };
      state.currentTrace.events.push(event);
      if (event.tokenUsage) {
        state.currentTrace.totalTokens += event.tokenUsage.totalTokens;
        state.currentTrace.totalCostUsd += event.tokenUsage.estimatedCostUsd;
      }
    },
    updateTraceEvent: (state, action: PayloadAction<{ id: string; updates: Partial<AgentTraceEvent> }>) => {
      if (!state.currentTrace) return;
      const event = state.currentTrace.events.find(e => e.id === action.payload.id);
      if (event) {
        Object.assign(event, action.payload.updates);
        if (action.payload.updates.completedAt && event.startedAt) {
          event.durationMs = action.payload.updates.completedAt - event.startedAt;
        }
        if (action.payload.updates.tokenUsage) {
          state.currentTrace.totalTokens += action.payload.updates.tokenUsage.totalTokens;
          state.currentTrace.totalCostUsd += action.payload.updates.tokenUsage.estimatedCostUsd;
        }
      }
    },
    completeTrace: (state, action: PayloadAction<{ status: 'done' | 'error' }>) => {
      if (!state.currentTrace) return;
      state.currentTrace.completedAt = Date.now();
      state.currentTrace.status = action.payload.status;
      // Archive to history (keep last 20)
      state.history = [state.currentTrace, ...state.history].slice(0, 20);
    },
    clearHistory: (state) => {
      state.history = [];
    },
    setAgentStatus: (state, action: PayloadAction<{ agentName: AgentName; status: AgentStatus; message?: string }>) => {
      if (!state.currentTrace) return;
      // Find the last event for this agent and update, or add a status event
      const existing = [...state.currentTrace.events].reverse().find(e => e.agentName === action.payload.agentName);
      if (existing) {
        existing.status = action.payload.status;
        if (action.payload.message) existing.message = action.payload.message;
        if (action.payload.status === 'done' || action.payload.status === 'error') {
          existing.completedAt = Date.now();
          if (existing.startedAt) existing.durationMs = existing.completedAt - existing.startedAt;
        }
      }
    },
  },
});

export const {
  toggleDebugger,
  setDebuggerVisible,
  togglePinned,
  startNewTrace,
  addTraceEvent,
  updateTraceEvent,
  completeTrace,
  clearHistory,
  setAgentStatus,
} = agentDebugSlice.actions;

export default agentDebugSlice.reducer;
