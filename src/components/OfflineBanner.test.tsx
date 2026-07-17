import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { OfflineBanner } from './OfflineBanner';

vi.mock('../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => (key === 'offline.banner' ? 'You are offline' : key),
    lang: 'en',
  }),
}));

describe('OfflineBanner', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  });

  it('is hidden while online', () => {
    render(<OfflineBanner />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('shows when offline event fires', () => {
    render(<OfflineBanner />);
    act(() => {
      Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByRole('status')).toHaveTextContent('You are offline');
  });
});
