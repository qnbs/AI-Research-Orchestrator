import React from 'react';
import { motion } from 'framer-motion';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { toggleDebugger } from '../../store/slices/agentDebugSlice';
import { useTranslation } from '../../hooks/useTranslation';
import { useMotionSafeLoop } from '../../hooks/useMotionSafeLoop';

const RUNNING_PULSE_ANIMATE = { scale: [1, 1.35, 1] };
const RUNNING_PULSE_TRANSITION = { duration: 1, repeat: Infinity };

export const AgentDebuggerToggle: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { isVisible, currentTrace } = useAppSelector((s) => s.agentDebug);
  const isRunning = currentTrace?.status === 'running';
  const runningPulse = useMotionSafeLoop(RUNNING_PULSE_ANIMATE, RUNNING_PULSE_TRANSITION);

  return (
    <motion.button
      type="button"
      onClick={() => dispatch(toggleDebugger())}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`relative p-2 rounded-lg transition-colors text-sm ${
        isVisible
          ? 'bg-brand-accent/10 text-brand-accent border border-brand-accent/30'
          : 'text-text-secondary hover:text-text-primary glass-panel'
      }`}
      title={t('debugger.toggle.title')}
      aria-pressed={isVisible}
      aria-label={t('debugger.toggle.aria')}
    >
      🐛
      {isRunning && (
        <motion.span
          className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-brand-accent"
          animate={runningPulse.animate}
          transition={runningPulse.transition}
        />
      )}
    </motion.button>
  );
};
