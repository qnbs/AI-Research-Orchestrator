import { describe, it, expect, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { ServiceWorkerRegistrationFailedBanner } from './ServiceWorkerRegistrationFailedBanner';

const TRANSLATIONS: Record<string, string> = {
  'sw.registration.failed':
    'Offline support could not be enabled for this session (reason: {reason}). Live features are unaffected.',
  'sw.registration.dismiss': 'Dismiss',
};

vi.mock('../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string | number>) => {
      const template = TRANSLATIONS[key] ?? key;
      if (!values) return template;
      return Object.entries(values).reduce(
        (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)),
        template,
      );
    },
    lang: 'en',
  }),
}));

function dispatchRegistrationFailed(reason: string) {
  window.dispatchEvent(new CustomEvent('sw-registration-failed', { detail: { reason } }));
}

describe('ServiceWorkerRegistrationFailedBanner', () => {
  it('is hidden until registration fails', () => {
    render(<ServiceWorkerRegistrationFailedBanner />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('shows a redacted reason once sw-registration-failed fires', () => {
    render(<ServiceWorkerRegistrationFailedBanner />);
    act(() => {
      dispatchRegistrationFailed('SecurityError');
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      'Offline support could not be enabled for this session (reason: SecurityError). Live features are unaffected.',
    );
  });

  it('hides after Dismiss is clicked', () => {
    render(<ServiceWorkerRegistrationFailedBanner />);
    act(() => {
      dispatchRegistrationFailed('TypeError');
    });
    expect(screen.getByRole('status')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('status')).toBeNull();
  });
});
