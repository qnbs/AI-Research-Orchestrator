import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResearchResultsPanel } from './ResearchResultsPanel';
import type { ResearchAnalysis } from '../types';

vi.mock('../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    lang: 'en',
  }),
}));

const analysis: ResearchAnalysis = {
  summary: '**Hello** summary',
  keyFindings: ['Finding one'],
  synthesizedTopic: 'CRISPR ethics',
};

const idleSimilar = { loading: false, error: null, articles: null };
const idleOnline = { loading: false, error: null, findings: null };

describe('ResearchResultsPanel', () => {
  it('renders loading skeletons for similar articles', () => {
    render(
      <ResearchResultsPanel
        analysis={analysis}
        onClearResearch={vi.fn()}
        onStartNewReview={vi.fn()}
        similarArticlesState={{ loading: true, error: null, articles: null }}
        onlineFindingsState={idleOnline}
      />,
    );
    expect(screen.getByText('research.result.complete')).toBeInTheDocument();
    expect(document.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('renders localized similar-articles error', () => {
    render(
      <ResearchResultsPanel
        analysis={analysis}
        onClearResearch={vi.fn()}
        onStartNewReview={vi.fn()}
        similarArticlesState={{ loading: false, error: 'raw provider boom', articles: null }}
        onlineFindingsState={idleOnline}
      />,
    );
    expect(screen.getByText('research.error.similar')).toBeInTheDocument();
    expect(screen.queryByText('raw provider boom')).toBeNull();
  });

  it('renders populated findings and continuation CTA', () => {
    render(
      <ResearchResultsPanel
        analysis={analysis}
        onClearResearch={vi.fn()}
        onStartNewReview={vi.fn()}
        similarArticlesState={{
          loading: false,
          error: null,
          articles: [{ pmid: '1', title: 'Paper', reason: 'Related' }],
        }}
        onlineFindingsState={{
          loading: false,
          error: null,
          findings: {
            summary: 'Web take',
            sources: [{ title: 'Src', uri: 'https://example.com' }],
          },
        }}
      />,
    );
    expect(screen.getByText('Finding one')).toBeInTheDocument();
    expect(screen.getByText('Paper')).toBeInTheDocument();
    expect(screen.getByText('Web take')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'research.continue.cta' })).toBeInTheDocument();
  });

  it('renders online error without leaking raw message', () => {
    render(
      <ResearchResultsPanel
        analysis={{ ...analysis, synthesizedTopic: '' }}
        onClearResearch={vi.fn()}
        onStartNewReview={vi.fn()}
        similarArticlesState={idleSimilar}
        onlineFindingsState={{ loading: false, error: 'network fail', findings: null }}
      />,
    );
    expect(screen.getByText('research.error.online')).toBeInTheDocument();
    expect(screen.queryByText('network fail')).toBeNull();
  });
});
