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

  it('updates the location hash and dispatches hashchange on "Return Home"', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const hashChangeListener = vi.fn();
    window.addEventListener('hashchange', hashChangeListener);

    render(
      <ErrorBoundary>
        <ControllableBoom shouldThrow />
      </ErrorBoundary>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Return Home/i }));

    expect(window.location.hash).toBe('#home');
    expect(hashChangeListener).toHaveBeenCalledTimes(1);

    window.removeEventListener('hashchange', hashChangeListener);
    spy.mockRestore();
  });

  it('calls window.location.reload on "Reload Page"', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const reloadSpy = vi.spyOn(window.location, 'reload').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ControllableBoom shouldThrow />
      </ErrorBoundary>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Reload Page/i }));

    expect(reloadSpy).toHaveBeenCalledTimes(1);
    reloadSpy.mockRestore();
    spy.mockRestore();
  });

  it('copies error and component stack to clipboard from Technical Diagnostics', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    render(
      <ErrorBoundary>
        <ControllableBoom shouldThrow />
      </ErrorBoundary>,
    );

    fireEvent.click(screen.getByText(/Technical Diagnostics/i));
    fireEvent.click(screen.getByRole('button', { name: /Copy Stack Trace/i }));

    await Promise.resolve();

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0][0]).toContain('test-boom');
    spy.mockRestore();
  });

  it('renders technical diagnostics with the underlying error message', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <ControllableBoom shouldThrow />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/test-boom/)).toBeInTheDocument();
    expect(screen.getByText(/Error Code:/i)).toBeInTheDocument();
    spy.mockRestore();
  });
});
