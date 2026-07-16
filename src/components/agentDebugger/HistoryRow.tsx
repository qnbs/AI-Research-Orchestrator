import React from 'react';
import { motion } from 'framer-motion';
import type { AgentPipelineTrace } from '../../types';
import { StatusDot } from './StatusDot';

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
