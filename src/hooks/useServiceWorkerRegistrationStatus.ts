import { useEffect, useState } from 'react';

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
 * dispatching, so this hook can catch up on it. Two catch-up points, not
 * one: the lazy useState initializer covers a failure that already
 * happened before this component's first render, but React 18+ schedules
 * passive effects asynchronously after paint - a failure can still occur
 * in the real gap between that render and this effect actually attaching
 * the live listener. The effect re-checks the same marker immediately
 * after attaching the listener and replays it through the same handler
 * (so the state update happens inside a callback, the pattern
 * react-hooks/set-state-in-effect expects - not a bare effect-body
 * setState call), closing that gap too.
 */
export function useServiceWorkerRegistrationStatus() {
  // Lazy initializer, not an effect-body setState: __swRegistrationFailedReason is set
  // by a plain <script> tag before React ever loads, so it's already synchronously
  // available at first render - no need to synchronize it in on mount.
  const [failureReason, setFailureReason] = useState<string | null>(
    () => window.__swRegistrationFailedReason ?? null,
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

    // Catch-up #2 (see the doc comment above): replay a marker that appeared
    // during the async gap between this component's render and this effect
    // running, through the same handler used for live events.
    const reasonSetDuringGap = window.__swRegistrationFailedReason;
    if (reasonSetDuringGap) {
      onRegistrationFailed(
        new CustomEvent('sw-registration-failed', { detail: { reason: reasonSetDuringGap } }),
      );
    }

    return () => window.removeEventListener('sw-registration-failed', onRegistrationFailed);
  }, []);

  return {
    registrationFailed: failureReason !== null && !dismissed,
    failureReason,
    dismiss: () => setDismissed(true),
  };
}
