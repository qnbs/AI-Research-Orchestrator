import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { OfflineBanner } from './OfflineBanner';

vi.mock('../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => (key === 'offline.banner' ? 'You are offline' : key),
    lang: 'en',
  }),
}));

describe('OfflineBanner', () => {
  it('is hidden while online', () => {
    render(<OfflineBanner getOnline={() => true} />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('shows when getOnline reports offline', () => {
    render(<OfflineBanner getOnline={() => false} />);
    expect(screen.getByRole('status')).toHaveTextContent('You are offline');
  });

  it('shows when offline event fires while getOnline stays true', () => {
    render(<OfflineBanner getOnline={() => true} />);
    expect(screen.queryByRole('status')).toBeNull();
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByRole('status')).toHaveTextContent('You are offline');
  });
});
