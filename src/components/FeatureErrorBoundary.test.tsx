import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FeatureErrorBoundary } from './FeatureErrorBoundary';

function Boom(): React.ReactElement {
  throw new Error('feature-boom');
}

describe('FeatureErrorBoundary', () => {
  it('renders a local fallback without taking down the whole tree', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <div>
        <span>sibling-ok</span>
        <FeatureErrorBoundary featureName="Knowledge Base">
          <Boom />
        </FeatureErrorBoundary>
      </div>,
    );
    expect(screen.getByText('sibling-ok')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/Knowledge Base unavailable/i);
    expect(screen.getByRole('button', { name: /Try again/i })).toBeInTheDocument();
    spy.mockRestore();
  });

  it('retries and calls onReset', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onReset = vi.fn();
    let shouldThrow = true;
    function Controllable(): React.ReactElement {
      if (shouldThrow) throw new Error('feature-boom');
      return <div>recovered</div>;
    }
    render(
      <FeatureErrorBoundary
        featureName="Orchestrator"
        onReset={() => {
          shouldThrow = false;
          onReset();
        }}
      >
        <Controllable />
      </FeatureErrorBoundary>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Try again/i }));
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(screen.getByText('recovered')).toBeInTheDocument();
    spy.mockRestore();
  });
});
