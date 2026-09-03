import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { BottomNavBar } from './BottomNavBar';

vi.mock('../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    lang: 'en',
  }),
}));

vi.mock('../hooks/useHaptic', () => ({
  useHaptic: () => () => undefined,
}));

vi.mock('../contexts/UIContext', () => ({
  useUI: () => ({ setIsCommandPaletteOpen: vi.fn() }),
}));

describe('BottomNavBar More disclosure', () => {
  it('closes the More panel on Escape', () => {
    render(
      <BottomNavBar
        currentView="orchestrator"
        onViewChange={vi.fn()}
        knowledgeBaseArticleCount={0}
        hasReports={false}
        isResearching={false}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'nav.more' }));
    expect(screen.getByRole('button', { name: 'nav.home' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('button', { name: 'nav.home' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'nav.more' })).toHaveFocus();
  });

  it('closes the More panel when the current view changes', () => {
    const { rerender } = render(
      <BottomNavBar
        currentView="orchestrator"
        onViewChange={vi.fn()}
        knowledgeBaseArticleCount={0}
        hasReports={false}
        isResearching={false}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'nav.more' }));
    expect(screen.getByRole('button', { name: 'nav.home' })).toBeInTheDocument();
    rerender(
      <BottomNavBar
        currentView="research"
        onViewChange={vi.fn()}
        knowledgeBaseArticleCount={0}
        hasReports={false}
        isResearching={false}
      />,
    );
    expect(screen.queryByRole('button', { name: 'nav.home' })).not.toBeInTheDocument();
  });
});
