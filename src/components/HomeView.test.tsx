import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HomeView from './HomeView';

vi.mock('../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    lang: 'en',
  }),
}));

const kbState = vi.hoisted(() => ({
  uniqueArticles: [] as unknown[],
}));

vi.mock('../contexts/KnowledgeBaseContext', () => ({
  useKnowledgeBase: () => ({
    uniqueArticles: kbState.uniqueArticles,
    getRecentResearchEntries: () => [],
  }),
}));

vi.mock('./InferenceModeBadge', () => ({
  InferenceModeBadge: () => <span>badge</span>,
}));

describe('HomeView launchpad', () => {
  beforeEach(() => {
    kbState.uniqueArticles = [];
  });

  it('uses the singular library status when one article is present', () => {
    kbState.uniqueArticles = [{}];
    render(<HomeView onNavigate={vi.fn()} />);
    expect(screen.getByText('home.status.library_one')).toBeInTheDocument();
  });

  it('navigates to orchestrator and research', () => {
    const onNavigate = vi.fn();
    render(<HomeView onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: /home.hero.title/i }));
    expect(onNavigate).toHaveBeenCalledWith('orchestrator');
    fireEvent.click(screen.getByRole('button', { name: /home.secondary.title/i }));
    expect(onNavigate).toHaveBeenCalledWith('research');
  });

  it('uses a two-column grid class at md', () => {
    const { container } = render(<HomeView onNavigate={vi.fn()} />);
    expect(container.querySelector('.md\\:grid-cols-2')).toBeTruthy();
    expect(container.querySelector('.md\\:grid-cols-1')).toBeNull();
  });
});
