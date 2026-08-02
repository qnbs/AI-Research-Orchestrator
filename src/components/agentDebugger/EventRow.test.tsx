import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { AgentTraceEvent } from '../../types';
import type { PromptBudgetAccounting } from '../../lib/promptBudget';
import { EventRow } from './EventRow';

vi.mock('../../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      if (params) {
        return `${key}:${JSON.stringify(params)}`;
      }
      return key;
    },
    lang: 'en',
  }),
}));

vi.mock('framer-motion', async () => {
  const React = await import('react');
  return {
    motion: {
      div: ({
        children,
        ...props
      }: React.PropsWithChildren<Record<string, unknown>>): React.ReactElement =>
        React.createElement('div', props, children),
      span: ({
        children,
        ...props
      }: React.PropsWithChildren<Record<string, unknown>>): React.ReactElement =>
        React.createElement('span', props, children),
    },
    AnimatePresence: ({ children }: React.PropsWithChildren): React.ReactElement =>
      React.createElement(React.Fragment, null, children),
  };
});

const rankingBudget: PromptBudgetAccounting = {
  stage: 'ranking',
  provider: 'gemini',
  model: 'gemini-2.5-flash',
  totalRetrieved: 20,
  includedInPrompt: 8,
  omittedFromPrompt: 12,
  omittedPmids: [],
  estimatedPromptTokens: 1500,
  inputTokenBudget: 16_000,
  chunkIndex: 0,
  chunkCount: 1,
  truncatedTitleCount: 0,
  truncatedAbstractCount: 0,
  selectionMode: 'lexical-prefilter',
};

const synthesisBudget: PromptBudgetAccounting = {
  stage: 'synthesis',
  provider: 'gemini',
  model: 'gemini-2.5-flash',
  totalRetrieved: 5,
  includedInPrompt: 3,
  omittedFromPrompt: 2,
  omittedPmids: ['111', '222'],
  estimatedPromptTokens: 900,
  inputTokenBudget: 16_000,
  chunkIndex: 0,
  chunkCount: 1,
  truncatedTitleCount: 1,
  truncatedAbstractCount: 2,
  truncatedAiSummaryCount: 3,
  selectionMode: 'full-corpus',
};

const baseEvent = (overrides: Partial<AgentTraceEvent> = {}): AgentTraceEvent => ({
  id: 'evt-1',
  agentName: 'Ranker',
  status: 'done',
  message: 'Ranking complete',
  startedAt: 1,
  ...overrides,
});

describe('EventRow promptBudget', () => {
  it('surfaces ranking prompt-budget summary from event metadata', () => {
    render(
      <EventRow
        index={0}
        isLast
        event={baseEvent({
          metadata: { promptBudget: rankingBudget },
        })}
      />,
    );

    const summary = screen.getByTestId('prompt-budget-summary');
    expect(summary).toHaveTextContent('debugger.promptBudget.stage.ranking');
    expect(summary).toHaveTextContent('8/20');
    expect(summary).toHaveTextContent('debugger.promptBudget.included');
    expect(summary).toHaveTextContent('12');
    expect(summary).toHaveTextContent('debugger.promptBudget.omitted');
    expect(summary.textContent ?? '').toMatch(/1[.,]?500/);
    expect(summary).toHaveTextContent('debugger.promptBudget.mode.lexicalPrefilter');
  });

  it('expands omitted PMIDs and synthesis field-truncation details', () => {
    render(
      <EventRow
        index={1}
        isLast={false}
        event={baseEvent({
          agentName: 'Synthesizer',
          metadata: { promptBudget: synthesisBudget },
        })}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /debugger\.details\.show/ }));
    expect(screen.getByText('debugger.promptBudget.omittedPmids')).toBeInTheDocument();
    expect(screen.getByText('111, 222')).toBeInTheDocument();
    expect(
      screen.getByText(/debugger\.promptBudget\.fieldTruncationSummarySynthesis/),
    ).toBeInTheDocument();
  });

  it('hides prompt-budget chrome when metadata is absent', () => {
    render(<EventRow index={0} isLast event={baseEvent()} />);
    expect(screen.queryByTestId('prompt-budget-summary')).toBeNull();
  });
});
