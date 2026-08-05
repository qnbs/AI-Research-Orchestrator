import { useEffect, useState } from 'react';

type WindowWithSwFailure = Window & { __swRegistrationFailedReason?: string };

/**
 * Bridges public/register-sw.js's "sw-registration-failed" window CustomEvent
 * into React state, so a failed service-worker registration (previously a
 * silent no-op - see the 531885f base-href regression, ADR 0004) surfaces as
 * a small, non-blocking, dismissible status instead of being invisible.
 * `reason` is a coarse error name only (e.g. "SecurityError") - never a raw
 * message, URL, or stack trace.
 *
 * register-sw.js's registration attempt runs from a window "load" handler,
 * which can fire - and fail - before React finishes its loading/onboarding
 * gates and mounts the component using this hook. A plain event listener
 * alone would miss that case, the same "event fired before hook mounts"
 * problem useServiceWorkerUpdate already defends against for waiting
 * workers (by checking navigator.serviceWorker.getRegistration() on mount).
 * register-sw.js stores the same redacted reason on `window` before
 * dispatching, so this hook can catch up on mount even if it missed the
 * live event.
 */
export function useServiceWorkerRegistrationStatus() {
  // Lazy initializer, not an effect-body setState: __swRegistrationFailedReason is set
  // by a plain <script> tag before React ever loads, so it's already synchronously
  // available at first render - no need to synchronize it in on mount.
  const [failureReason, setFailureReason] = useState<string | null>(
    () => (window as WindowWithSwFailure).__swRegistrationFailedReason ?? null,
  );
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onRegistrationFailed = (event: Event) => {
      const detail = (event as CustomEvent<{ reason: string }>).detail;
      setFailureReason(detail?.reason ?? 'unknown');
      // A later failure (e.g. a retried registration) must be able to
      // re-surface the banner even if an earlier one was dismissed.
      setDismissed(false);
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
