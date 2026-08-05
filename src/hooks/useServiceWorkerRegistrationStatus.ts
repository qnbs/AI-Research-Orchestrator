import { useEffect, useState } from 'react';

/**
 * Bridges public/register-sw.js's "sw-registration-failed" window CustomEvent
 * into React state, so a failed service-worker registration (previously a
 * silent no-op - see the 531885f base-href regression, ADR 0004) surfaces as
 * a small, non-blocking, dismissible status instead of being invisible.
 * `reason` is a coarse error name only (e.g. "SecurityError") - never a raw
 * message, URL, or stack trace.
 */
export function useServiceWorkerRegistrationStatus() {
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onRegistrationFailed = (event: Event) => {
      const detail = (event as CustomEvent<{ reason: string }>).detail;
      setFailureReason(detail?.reason ?? 'unknown');
    };
    window.addEventListener('sw-registration-failed', onRegistrationFailed);
    return () => window.removeEventListener('sw-registration-failed', onRegistrationFailed);
  }, []);

  return {
    registrationFailed: failureReason !== null && !dismissed,
    failureReason,
    dismiss: () => setDismissed(true),
  };
}
