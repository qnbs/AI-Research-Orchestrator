import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ResearchBriefSummary } from './ResearchBriefSummary';
import type { ResearchInput } from '../types';

vi.mock('../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    lang: 'en',
  }),
}));

const sampleInput: ResearchInput = {
  researchTopic: 'aspirin stroke prevention',
  dateRange: '5',
  articleTypes: ['Randomized Controlled Trial'],
  synthesisFocus: 'overview',
  maxArticlesToScan: 20,
  topNToSynthesize: 5,
  includeArxiv: true,
  educationalDemoMode: false,
};

describe('ResearchBriefSummary', () => {
  it('renders topic and status for an active run', () => {
    render(
      <ResearchBriefSummary
        input={sampleInput}
        reportStatus="generating"
        hasReport={false}
        isSaved={false}
        isProcessing
        onEdit={vi.fn()}
        onNewSearch={vi.fn()}
      />,
    );
    expect(screen.getByTestId('research-brief-summary')).toBeInTheDocument();
    expect(screen.getByText('aspirin stroke prevention')).toBeInTheDocument();
    expect(screen.getByText('orchestrator.brief.status.running')).toBeInTheDocument();
  });

  it('disables edit while processing', () => {
    const onEdit = vi.fn();
    render(
      <ResearchBriefSummary
        input={sampleInput}
        reportStatus="streaming"
        hasReport
        isSaved={false}
        isProcessing
        onEdit={onEdit}
        onNewSearch={vi.fn()}
      />,
    );
    const editBtn = screen.getByRole('button', { name: 'orchestrator.brief.edit' });
    expect(editBtn).toBeDisabled();
    fireEvent.click(editBtn);
    expect(onEdit).not.toHaveBeenCalled();
  });
});
