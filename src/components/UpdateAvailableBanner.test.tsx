import { describe, it, expect, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { UpdateAvailableBanner } from './UpdateAvailableBanner';

vi.mock('../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      key === 'sw.update.available'
        ? 'A new version of this app is available.'
        : key === 'sw.update.reload'
          ? 'Reload'
          : key,
    lang: 'en',
  }),
}));

function dispatchUpdateAvailable(registration: unknown) {
  window.dispatchEvent(new CustomEvent('sw-update-available', { detail: { registration } }));
}

describe('UpdateAvailableBanner', () => {
  it('is hidden until an update is available', () => {
    render(<UpdateAvailableBanner />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('shows the reload prompt once sw-update-available fires', () => {
    render(<UpdateAvailableBanner />);
    act(() => {
      dispatchUpdateAvailable({ waiting: { postMessage: vi.fn() } });
    });
    expect(screen.getByRole('status')).toHaveTextContent('A new version of this app is available.');
  });

  it('posts SKIP_WAITING to the waiting worker when Reload is clicked', () => {
    const postMessage = vi.fn();
    render(<UpdateAvailableBanner />);
    act(() => {
      dispatchUpdateAvailable({ waiting: { postMessage } });
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
  });
});
