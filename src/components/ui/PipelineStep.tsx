/**
 * PipelineStep — Horizontal / vertical agent pipeline stepper.
 *
 * Features:
 *  • Animated connector lines fill with gradient as steps complete
 *  • Active step node pulses with neon-cyan glow (CSS animation)
 *  • Framer Motion spring transitions when currentStep changes
 *  • Supports both horizontal (default) and vertical orientations
 *  • Accessible: uses aria-current + role="list"
 */
import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AgentStatus } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PipelineStepItem {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  /** Override per-step status for mixed pipelines */
  status?: AgentStatus;
}

export interface PipelineStepProps {
  steps: PipelineStepItem[];
  /** Zero-based index of the currently active step */
  currentStep: number;
  /** Overall pipeline status — drives default step coloring */
  status?: AgentStatus;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  onStepClick?: (index: number) => void;
}

// ─── Per-step status resolution ───────────────────────────────────────────────

function resolveStepStatus(
  index: number,
  currentStep: number,
  pipelineStatus: AgentStatus,
  stepOverride?: AgentStatus,
): AgentStatus {
  if (stepOverride) return stepOverride;
  if (index < currentStep) return 'done';
  if (index === currentStep) return pipelineStatus === 'error' ? 'error' : pipelineStatus;
  return 'idle';
}

// ─── Node icon ────────────────────────────────────────────────────────────────

const NodeIcon: React.FC<{ status: AgentStatus; icon?: React.ReactNode; label: string }> = ({
  status,
  icon,
  label,
}) => {
  if (status === 'done') {
    return (
      <svg className="w-4 h-4 text-accent-green" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    );
  }
  if (status === 'error') {
    return (
      <svg className="w-4 h-4 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    );
  }
  if (icon) return <>{icon}</>;
  return <span className="text-xs font-bold text-text-secondary">{label.slice(0, 2)}</span>;
};

// ─── Horizontal Step Node ─────────────────────────────────────────────────────

const HStepNode: React.FC<{
  step: PipelineStepItem;
  status: AgentStatus;
  isCurrent: boolean;
  onClick?: () => void;
}> = ({ step, status, isCurrent, onClick }) => (
  <div className="flex flex-col items-center gap-1.5 flex-shrink-0" style={{ minWidth: 60 }}>
    <motion.button
      className={`pipeline-node pipeline-node--${status} ${onClick ? 'cursor-pointer' : ''}`}
      animate={
        status === 'running'
          ? { scale: [1, 1.08, 1] }
          : { scale: 1 }
      }
      transition={
        status === 'running'
          ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
          : { type: 'spring', stiffness: 400, damping: 25 }
      }
      onClick={onClick}
      aria-current={isCurrent ? 'step' : undefined}
      tabIndex={onClick ? 0 : -1}
    >
      <NodeIcon status={status} icon={step.icon} label={step.label} />
    </motion.button>

    <div className="text-center" style={{ maxWidth: 80 }}>
      <p
        className={`text-[11px] font-semibold leading-tight truncate ${
          status === 'running'
            ? 'text-brand-accent'
            : status === 'done'
            ? 'text-accent-green'
            : status === 'error'
            ? 'text-red-400'
            : 'text-text-secondary'
        }`}
      >
        {step.label}
      </p>
      {step.description && isCurrent && (
        <motion.p
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="text-[10px] text-text-secondary mt-0.5 leading-tight"
        >
          {step.description}
        </motion.p>
      )}
    </div>
  </div>
);

// ─── Connector ────────────────────────────────────────────────────────────────

const HConnector: React.FC<{ leftStatus: AgentStatus }> = ({ leftStatus }) => {
  const isDone = leftStatus === 'done';
  const isActive = leftStatus === 'running';

  return (
    <div className={`pipeline-connector ${isDone ? 'pipeline-connector--done' : isActive ? 'pipeline-connector--active' : ''}`}>
      <AnimatePresence>
        {(isDone || isActive) && (
          <motion.div
            key={`fill-${leftStatus}`}
            className="absolute inset-0"
            style={{
              background: isDone
                ? 'linear-gradient(90deg, var(--color-brand-accent), var(--color-accent-green))'
                : 'linear-gradient(90deg, var(--color-brand-accent), var(--color-accent-cyan))',
            }}
            initial={{ scaleX: 0, transformOrigin: 'left' }}
            animate={{ scaleX: isDone ? 1 : 0.6 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Vertical variant ─────────────────────────────────────────────────────────

const VPipelineStep: React.FC<PipelineStepProps> = ({
  steps,
  currentStep,
  status = 'idle',
  onStepClick,
  className = '',
}) => (
  <ol role="list" className={`space-y-0 ${className}`} aria-label="Pipeline steps">
    {steps.map((step, i) => {
      const stepStatus = resolveStepStatus(i, currentStep, status, step.status);
      const isCurrent = i === currentStep;
      const isLast = i === steps.length - 1;

      return (
        <li key={step.id} className="timeline-step" aria-current={isCurrent ? 'step' : undefined}>
          <motion.div
            className={`pipeline-node pipeline-node--${stepStatus} relative z-10`}
            animate={stepStatus === 'running' ? { scale: [1, 1.1, 1] } : { scale: 1 }}
            transition={stepStatus === 'running' ? { duration: 1.5, repeat: Infinity } : {}}
            onClick={onStepClick ? () => onStepClick(i) : undefined}
          >
            <NodeIcon status={stepStatus} icon={step.icon} label={step.label} />
          </motion.div>

          <div className="flex-1 min-w-0 pb-1">
            <p
              className={`text-sm font-semibold ${
                stepStatus === 'running' ? 'text-brand-accent' :
                stepStatus === 'done'    ? 'text-accent-green' :
                stepStatus === 'error'   ? 'text-red-400' :
                                           'text-text-secondary'
              }`}
            >
              {step.label}
            </p>
            <AnimatePresence>
              {(isCurrent || stepStatus === 'running') && step.description && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-xs text-text-secondary mt-0.5"
                >
                  {step.description}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {!isLast && (
            <div
              className="absolute left-[17px] top-9 bottom-0 w-px"
              style={{
                background: stepStatus === 'done'
                  ? 'linear-gradient(to bottom, var(--color-brand-accent), var(--color-border))'
                  : 'var(--color-border)',
              }}
            />
          )}
        </li>
      );
    })}
  </ol>
);

// ─── Main export ──────────────────────────────────────────────────────────────

const PipelineStepInner: React.FC<PipelineStepProps> = (props) => {
  const { steps, currentStep, status = 'idle', orientation = 'horizontal', className = '', onStepClick } = props;

  if (orientation === 'vertical') {
    return <VPipelineStep {...props} />;
  }

  return (
    <div
      role="list"
      aria-label="Pipeline steps"
      className={`flex items-start gap-0 w-full ${className}`}
    >
      {steps.map((step, i) => {
        const stepStatus = resolveStepStatus(i, currentStep, status, step.status);
        const isCurrent = i === currentStep;
        const isLast = i === steps.length - 1;

        return (
          <React.Fragment key={step.id}>
            <div role="listitem">
              <HStepNode
                step={step}
                status={stepStatus}
                isCurrent={isCurrent}
                onClick={onStepClick ? () => onStepClick(i) : undefined}
              />
            </div>
            {!isLast && (
              <div className="flex-1 mt-[17px]">
                <HConnector leftStatus={stepStatus} />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export const PipelineStep = memo(PipelineStepInner);
