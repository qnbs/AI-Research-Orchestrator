import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingIndicatorProps {
  title: string;
  phase: string;
  phases: readonly string[];
  phaseDetails: Record<string, string[]>;
  footerText?: string;
}

// ── Cybernetic Spinner (unchanged) ───────────────────────────────────────────
const CyberneticSpinner: React.FC = () => (
    <svg viewBox="0 0 100 100" className="w-24 h-24">
        <circle cx="50" cy="50" r="45" fill="none" stroke="var(--color-border)" strokeWidth="1" opacity="0.5" />
        <circle cx="50" cy="50" r="35" fill="none" stroke="var(--color-border)" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
        <circle cx="50" cy="50" r="45" fill="none" stroke="var(--color-brand-accent)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="60 220">
            <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="8s" repeatCount="indefinite" />
        </circle>
        <circle cx="50" cy="50" r="35" fill="none" stroke="var(--color-accent-cyan)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="40 180">
            <animateTransform attributeName="transform" type="rotate" from="360 50 50" to="0 50 50" dur="6s" repeatCount="indefinite" />
        </circle>
        <circle cx="50" cy="50" r="10" fill="var(--color-brand-accent)">
            <animate attributeName="r" from="10" to="12" dur="1s" begin="0s" repeatCount="indefinite" />
            <animate attributeName="opacity" from="1" to="0.5" dur="1s" begin="0s" repeatCount="indefinite" />
        </circle>
    </svg>
);

// ── Phase chip short label ────────────────────────────────────────────────────
function shortLabel(phase: string): string {
  return phase
    .replace(/^Phase\s+[\d\w]+[:.]\s*/i, '')
    .replace(/\.\.\.$/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 26);
}

// Emojis for each pipeline stage
function phaseIcon(index: number): string {
  const icons = ['🧠', '🔍', '📡', '🧬', '⭐', '📝', '✨', '🔖'];
  return icons[index % icons.length];
}

// ── Swipeable Pipeline Timeline ───────────────────────────────────────────────
const PipelineTimeline: React.FC<{
  phases: readonly string[];
  currentIndex: number;
}> = ({ phases, currentIndex }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll active chip into view
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const active = el.querySelector('[data-active="true"]') as HTMLElement | null;
    if (active) {
      active.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [currentIndex]);

  return (
    <div
      ref={scrollRef}
      className="flex gap-2 overflow-x-auto snap-x snap-mandatory py-3 mt-4 -mx-4 px-4"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
      role="list"
      aria-label="Agent pipeline phases"
    >
      {phases.map((phase, i) => {
        const isDone    = i < currentIndex;
        const isActive  = i === currentIndex;
        const isPending = i > currentIndex;

        return (
          <motion.div
            key={phase}
            data-active={isActive}
            role="listitem"
            aria-current={isActive ? 'step' : undefined}
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{
              opacity: isPending ? 0.45 : 1,
              y: 0,
              scale: isActive ? 1.06 : 1,
            }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
            className={[
              'flex-shrink-0 snap-center select-none cursor-default',
              'flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl border',
              'text-[11px] font-medium w-[120px] text-center leading-tight',
              'transition-colors duration-300',
              isDone   ? 'border-green-500/30 bg-green-500/10 text-green-400' : '',
              isActive ? 'border-brand-accent/60 bg-brand-accent/10 text-brand-accent shadow-[0_0_12px_rgba(56,189,248,0.18)]' : '',
              isPending ? 'border-border/25 bg-surface/20 text-text-secondary/50' : '',
            ].join(' ')}
          >
            <span className="text-base leading-none">
              {isDone ? '✓' : phaseIcon(i)}
            </span>
            <span>{shortLabel(phase)}</span>
            {isActive && (
              <motion.span
                className="inline-block w-4 h-[2px] rounded-full bg-brand-accent/60 mt-0.5"
                animate={{ scaleX: [0.4, 1, 0.4] }}
                transition={{ repeat: Infinity, duration: 1.4 }}
              />
            )}
          </motion.div>
        );
      })}
    </div>
  );
};

// ── Main LoadingIndicator ─────────────────────────────────────────────────────
export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  title,
  phase,
  phases,
  phaseDetails,
  footerText,
}) => {
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [currentSubPhase, setCurrentSubPhase] = useState('');
  const subPhaseIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    const index = phases.findIndex(p => p === phase);
    if (index !== -1) setCurrentPhaseIndex(index);

    if (subPhaseIntervalRef.current) clearInterval(subPhaseIntervalRef.current);

    const subPhases = phaseDetails[phase] ?? [];
    if (subPhases.length > 0) {
      let si = 0;
      setCurrentSubPhase(subPhases[si]);
      subPhaseIntervalRef.current = window.setInterval(() => {
        si = (si + 1) % subPhases.length;
        setCurrentSubPhase(subPhases[si]);
      }, 1500);
    } else {
      setCurrentSubPhase('');
    }

    return () => { if (subPhaseIntervalRef.current) clearInterval(subPhaseIntervalRef.current); };
  }, [phase, phases, phaseDetails]);

  const progress = ((currentPhaseIndex + 1) / phases.length) * 100;

  return (
    <div className="flex flex-col items-center justify-center text-center p-8 bg-surface/50 rounded-lg border border-border">
      <CyberneticSpinner />

      <h2 className="text-xl font-semibold brand-gradient-text mt-6 mb-2">{title}</h2>

      {/* Progress bar */}
      <div className="w-full max-w-2xl mx-auto mt-4 text-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={phase}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="text-text-primary text-base font-semibold mb-2"
            role="status"
            aria-live="polite"
          >
            {phase}
          </motion.p>
        </AnimatePresence>

        <div className="relative h-2 bg-border rounded-full overflow-hidden">
          <motion.div
            className="absolute top-0 left-0 h-2 bg-brand-accent rounded-full"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
          {/* Shimmer overlay */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            animate={{ x: ['-100%', '200%'] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'linear' }}
            style={{ width: '50%' }}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.p
            key={currentSubPhase}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="text-text-secondary text-sm mt-3 min-h-[20px]"
            role="status"
            aria-live="polite"
          >
            {currentSubPhase}
          </motion.p>
        </AnimatePresence>

        {/* ── Swipeable Pipeline Timeline (mobile-first) ── */}
        <PipelineTimeline phases={phases} currentIndex={currentPhaseIndex} />

        <p className="text-[10px] text-text-secondary/50 mt-1 md:hidden">
          ← Swipe to explore pipeline stages →
        </p>

        {footerText && (
          <p className="text-xs text-text-secondary/70 mt-4">{footerText}</p>
        )}
      </div>
    </div>
  );
};
