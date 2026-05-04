import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useFocusTrap } from './useFocusTrap';

function TrapDemo({ open }: { open: boolean }) {
  const ref = useFocusTrap<HTMLDivElement>(open);
  return (
    <div ref={ref} data-testid="trap">
      {open && (
        <>
          <button type="button">First</button>
          <button type="button">Last</button>
        </>
      )}
    </div>
  );
}

describe('useFocusTrap', () => {
  beforeEach(() => {
    document.body.focus();
  });

  it('cycles focus backwards from first to last with Shift+Tab', () => {
    render(<TrapDemo open />);
    const first = screen.getByRole('button', { name: 'First' });
    const last = screen.getByRole('button', { name: 'Last' });
    first.focus();
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });
});
