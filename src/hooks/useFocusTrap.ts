import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]:not([disabled])',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export type FocusTrapOptions = {
  /** When set, Escape dismisses the overlay (WCAG 2.1.2 / dialog pattern). */
  onEscape?: () => void;
  /** Lock document body scroll while the trap is active. Default false. */
  lockScroll?: boolean;
};

const cycleTabFocus = (
  e: KeyboardEvent,
  firstElement: HTMLElement,
  lastElement: HTMLElement,
): void => {
  if (e.key !== 'Tab') return;

  if (e.shiftKey && document.activeElement === firstElement) {
    lastElement.focus();
    e.preventDefault();
    return;
  }

  if (!e.shiftKey && document.activeElement === lastElement) {
    firstElement.focus();
    e.preventDefault();
  }
};

/**
 * Trap focus within a designated container (modal / panel).
 * Optionally dismisses on Escape and locks background scroll (WS-G).
 */
export const useFocusTrap = <T extends HTMLElement>(
  isOpen: boolean,
  options: FocusTrapOptions = {},
) => {
  const containerRef = useRef<T>(null);
  const { onEscape, lockScroll = false } = options;
  const onEscapeRef = useRef(onEscape);

  useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    const container = containerRef.current;
    if (!isOpen || !container) {
      return undefined;
    }

    const focusableElements = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    if (focusableElements.length === 0) {
      return undefined;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const previouslyFocusedElement = document.activeElement as HTMLElement | null;

    firstElement.focus();

    const previousOverflow = document.body.style.overflow;
    if (lockScroll) {
      document.body.style.overflow = 'hidden';
    }

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && onEscapeRef.current) {
        e.stopPropagation();
        onEscapeRef.current();
        return;
      }
      cycleTabFocus(e, firstElement, lastElement);
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (lockScroll) {
        document.body.style.overflow = previousOverflow;
      }
      previouslyFocusedElement?.focus?.();
    };
  }, [isOpen, lockScroll]);

  return containerRef;
};
