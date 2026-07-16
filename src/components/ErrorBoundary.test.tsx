import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

function ControllableBoom({ shouldThrow }: { shouldThrow: boolean }): React.ReactElement {
  if (shouldThrow) throw new Error('test-boom');
  return <div>recovered</div>;
}

describe('ErrorBoundary', () => {
  it('renders fallback UI on child error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <ControllableBoom shouldThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByText(/Unexpected Application Error/i)).toBeInTheDocument();
    expect(screen.getByText(/IndexedDB is preserved/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Try Again/i }));
    // Child still throws → fallback remains
    expect(screen.getByText(/Unexpected Application Error/i)).toBeInTheDocument();
    spy.mockRestore();
  });

  it('recovers when remounted with healthy children', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender } = render(
      <ErrorBoundary>
        <ControllableBoom shouldThrow />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/Unexpected Application Error/i)).toBeInTheDocument();

    rerender(
      <ErrorBoundary key="fresh">
        <ControllableBoom shouldThrow={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('recovered')).toBeInTheDocument();
    spy.mockRestore();
  });

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>ok</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText('ok')).toBeInTheDocument();
  });
});
