import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { useFocusTrap } from './useFocusTrap';

function TrapDemo({
  open,
  onEscape,
  lockScroll,
}: {
  open: boolean;
  onEscape?: () => void;
  lockScroll?: boolean;
}) {
  const ref = useFocusTrap<HTMLDivElement>(open, { onEscape, lockScroll });
  return (
    <div ref={ref} data-testid="trap" role="dialog" aria-modal="true">
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
    cleanup();
    document.body.style.overflow = '';
    document.body.focus();
  });

  it('cycles focus backwards from first to last with Shift+Tab', () => {
    render(<TrapDemo open />);
    const first = screen.getByRole('button', { name: 'First' });
    const last = screen.getByRole('button', { name: 'Last' });
    first.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it('cycles focus forwards from last to first with Tab', () => {
    render(<TrapDemo open />);
    const first = screen.getByRole('button', { name: 'First' });
    const last = screen.getByRole('button', { name: 'Last' });
    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(first);
  });

  it('calls onEscape when Escape is pressed', () => {
    const onEscape = vi.fn();
    render(<TrapDemo open onEscape={onEscape} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('locks and restores body scroll when lockScroll is enabled', () => {
    const { rerender, unmount } = render(<TrapDemo open lockScroll />);
    expect(document.body.style.overflow).toBe('hidden');
    rerender(<TrapDemo open={false} lockScroll />);
    unmount();
    expect(document.body.style.overflow).toBe('');
  });
});
