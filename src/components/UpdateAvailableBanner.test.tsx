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

  it('dispatches sw-request-reload when Reload is clicked', () => {
    const onRequestReload = vi.fn();
    window.addEventListener('sw-request-reload', onRequestReload);
    render(<UpdateAvailableBanner />);
    act(() => {
      dispatchUpdateAvailable({ waiting: { postMessage: vi.fn() } });
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(onRequestReload).toHaveBeenCalledTimes(1);
    window.removeEventListener('sw-request-reload', onRequestReload);
  });
});
