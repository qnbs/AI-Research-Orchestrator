import React from 'react';
import { motion } from 'framer-motion';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { toggleDebugger } from '../../store/slices/agentDebugSlice';

export const AgentDebuggerToggle: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isVisible, currentTrace } = useAppSelector((s) => s.agentDebug);
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
