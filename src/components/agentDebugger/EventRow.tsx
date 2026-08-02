import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AgentTraceEvent } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import type { TranslationKey } from '../../i18n/translations';
import { parsePromptBudgetFromMetadata } from '../../lib/promptBudget';
import { AGENT_ICONS, STATUS_RING, STATUS_TEXT } from './constants';
import { StatusDot } from './StatusDot';

const STATUS_LABEL_KEYS: Record<AgentTraceEvent['status'], TranslationKey> = {
  idle: 'debugger.status.idle',
  running: 'debugger.status.running',
  done: 'debugger.status.done',
  error: 'debugger.status.error',
  skipped: 'debugger.status.skipped',
};

const PROMPT_BUDGET_STAGE_KEYS: Record<'ranking' | 'synthesis', TranslationKey> = {
  ranking: 'debugger.promptBudget.stage.ranking',
  synthesis: 'debugger.promptBudget.stage.synthesis',
};

const PROMPT_BUDGET_MODE_KEYS: Record<'lexical-prefilter' | 'full-corpus', TranslationKey> = {
  'lexical-prefilter': 'debugger.promptBudget.mode.lexicalPrefilter',
  'full-corpus': 'debugger.promptBudget.mode.fullCorpus',
};

export const EventRow: React.FC<{
  event: AgentTraceEvent;
  index: number;
  isLast: boolean;
}> = ({ event, index, isLast }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const detailsId = `event-details-${event.id}`;
  const promptBudget = parsePromptBudgetFromMetadata(event.metadata);
  const dur =
    event.durationMs != null
      ? event.durationMs < 1000
        ? `${event.durationMs}ms`
        : `${(event.durationMs / 1000).toFixed(1)}s`
      : null;
  const hasOmittedPmids = (promptBudget?.omittedPmids?.length ?? 0) > 0;
  const hasFieldTruncation =
    promptBudget != null &&
    (promptBudget.truncatedTitleCount > 0 ||
      promptBudget.truncatedAbstractCount > 0 ||
      (promptBudget.truncatedAiSummaryCount ?? 0) > 0);
  const hasPromptBudgetDetails = hasOmittedPmids || hasFieldTruncation;
  const hasDetails = !!(
    event.inputSummary ||
    event.outputSummary ||
    event.error ||
    hasPromptBudgetDetails
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, delay: Math.min(index * 0.04, 0.3) }}
      className="flex gap-3"
    >
      <div className="flex flex-col items-center flex-shrink-0 w-9">
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center text-base z-10 flex-shrink-0 transition-all duration-300 ${STATUS_RING[event.status]}`}
        >
          {AGENT_ICONS[event.agentName] ?? '⚙️'}
        </div>
        {!isLast && (
          <motion.div
            className="w-px flex-1 min-h-3 bg-border mt-1"
            initial={{ scaleY: 0, originY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.3, delay: index * 0.04 + 0.15 }}
          />
        )}
      </div>

      <div className="flex-1 min-w-0 pb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-semibold ${STATUS_TEXT[event.status]}`}>
            {event.agentName}
          </span>
          <StatusDot status={event.status} />
          <span className="text-[10px] text-text-secondary bg-surface/80 px-1.5 py-0.5 rounded-md border border-border/60">
            {t(STATUS_LABEL_KEYS[event.status])}
          </span>
          {dur && <span className="ml-auto text-[11px] text-accent-cyan font-mono">{dur}</span>}
        </div>

        <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{event.message}</p>

        {event.tokenUsage && (
          <div className="mt-1.5 flex items-center gap-3 text-[10px] font-mono text-text-secondary">
            <span>
              ↑ {event.tokenUsage.inputTokens.toLocaleString()} {t('debugger.tokens.in')}
            </span>
            <span>
              ↓ {event.tokenUsage.outputTokens.toLocaleString()} {t('debugger.tokens.out')}
            </span>
            <span className="text-accent-amber">
              ${event.tokenUsage.estimatedCostUsd.toFixed(5)}
            </span>
          </div>
        )}

        {promptBudget && (
          <div
            className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-mono text-text-secondary"
            data-testid="prompt-budget-summary"
          >
            <span className="text-brand-accent/90">
              {t(PROMPT_BUDGET_STAGE_KEYS[promptBudget.stage])}
            </span>
            <span>
              {promptBudget.includedInPrompt}/{promptBudget.totalRetrieved}{' '}
              {t('debugger.promptBudget.included')}
            </span>
            {promptBudget.omittedFromPrompt > 0 && (
              <span className="text-accent-amber">
                {promptBudget.omittedFromPrompt.toLocaleString()}{' '}
                {t('debugger.promptBudget.omitted')}
              </span>
            )}
            <span>
              ~{promptBudget.estimatedPromptTokens.toLocaleString()}{' '}
              {t('debugger.promptBudget.estTokens')}
            </span>
            <span className="text-text-secondary/80">
              {t(PROMPT_BUDGET_MODE_KEYS[promptBudget.selectionMode])}
            </span>
          </div>
        )}

        {hasDetails && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            aria-controls={detailsId}
            className="flex items-center gap-1 text-[10px] text-brand-accent/80 hover:text-brand-accent mt-1 transition-colors"
          >
            <motion.span
              animate={{ rotate: expanded ? 90 : 0 }}
              transition={{ duration: 0.18 }}
              className="inline-block"
            >
              ▶
            </motion.span>
            {expanded ? t('debugger.details.hide') : t('debugger.details.show')}
          </button>
        )}

        <AnimatePresence>
          {expanded && hasDetails && (
            <motion.div
              id={detailsId}
              role="region"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div className="mt-1.5 space-y-1.5 text-[10px]">
                {event.inputSummary && (
                  <div className="bg-surface/50 rounded-lg p-2 border border-border/50">
                    <span className="text-text-secondary font-semibold uppercase tracking-wide block mb-0.5">
                      {t('debugger.details.input')}
                    </span>
                    <span className="text-text-primary font-mono whitespace-pre-wrap break-words">
                      {event.inputSummary}
                    </span>
                  </div>
                )}
                {event.outputSummary && (
                  <div className="bg-surface/50 rounded-lg p-2 border border-border/50">
                    <span className="text-text-secondary font-semibold uppercase tracking-wide block mb-0.5">
                      {t('debugger.details.output')}
                    </span>
                    <span className="text-text-primary font-mono whitespace-pre-wrap break-words">
                      {event.outputSummary}
                    </span>
                  </div>
                )}
                {hasPromptBudgetDetails && promptBudget && (
                  <div className="bg-surface/50 rounded-lg p-2 border border-border/50">
                    {hasOmittedPmids && (
                      <>
                        <span className="text-text-secondary font-semibold uppercase tracking-wide block mb-0.5">
                          {t('debugger.promptBudget.omittedPmids')}
                        </span>
                        <span className="text-text-primary font-mono whitespace-pre-wrap break-words">
                          {promptBudget.omittedPmids.join(', ')}
                        </span>
                      </>
                    )}
                    {hasFieldTruncation && (
                      <span
                        className={`text-text-secondary block ${hasOmittedPmids ? 'mt-1' : ''}`}
                      >
                        {t('debugger.promptBudget.fieldTruncation')}:{' '}
                        {promptBudget.stage === 'synthesis'
                          ? t('debugger.promptBudget.fieldTruncationSummarySynthesis', {
                              titleCount: promptBudget.truncatedTitleCount,
                              abstractCount: promptBudget.truncatedAbstractCount,
                              aiSummaryCount: promptBudget.truncatedAiSummaryCount ?? 0,
                            })
                          : t('debugger.promptBudget.fieldTruncationSummary', {
                              titleCount: promptBudget.truncatedTitleCount,
                              abstractCount: promptBudget.truncatedAbstractCount,
                            })}
                      </span>
                    )}
                  </div>
                )}
                {event.error && (
                  <div className="bg-red-400/10 rounded-lg p-2 border border-red-400/30">
                    <span className="text-red-400 font-mono break-words">{event.error}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
