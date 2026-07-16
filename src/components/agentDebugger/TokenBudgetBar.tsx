import React from 'react';
import { motion } from 'framer-motion';
import { TOKEN_BUDGET } from './constants';

export const TokenBudgetBar: React.FC<{
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
          <span className="text-text-primary font-semibold">{used.toLocaleString()}</span> /{' '}
          {TOKEN_BUDGET.toLocaleString()} tokens
        </span>
        <div className="flex items-center gap-3 text-text-secondary">
          <span className="text-accent-amber">${cost.toFixed(5)}</span>
          {durationSec !== null && <span>⏱ {durationSec.toFixed(1)}s</span>}
          <span
            className={`font-medium ${
              pct < 30 ? 'text-accent-green' : pct < 70 ? 'text-brand-accent' : 'text-accent-amber'
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
