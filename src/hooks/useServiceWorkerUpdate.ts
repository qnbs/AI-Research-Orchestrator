import { useCallback, useEffect, useState } from 'react';

/**
 * Bridges public/register-sw.js's "sw-update-available" window CustomEvent
 * (dispatched when a new service worker has installed alongside an already
 * active one) into React state. reload() dispatches "sw-request-reload"
 * rather than posting SKIP_WAITING to the worker directly - register-sw.js
 * owns that mechanic so it alone decides whether the resulting
 * controllerchange should reload the page (that event also fires on a page's
 * very first, uncontrolled -> controlled transition, not only on a genuine
 * update, so only a controllerchange caused by this explicit request reloads).
 */
export function useServiceWorkerUpdate() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    const onUpdateAvailable = (event: Event) => {
      const detail = (event as CustomEvent<{ registration: ServiceWorkerRegistration }>).detail;
      if (detail?.registration) setRegistration(detail.registration);
    };
    window.addEventListener('sw-update-available', onUpdateAvailable);

    // register-sw.js's notifyWaiting() runs on window "load", which can fire
    // before App finishes hydration/onboarding and mounts this hook - a
    // worker already waiting at that point would otherwise never be surfaced.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistration()
        .then((reg) => {
          if (reg?.waiting) setRegistration(reg);
        })
        .catch(() => undefined);
    }

    return () => window.removeEventListener('sw-update-available', onUpdateAvailable);
  }, []);

  const reload = useCallback(() => {
    if (!registration) return;
    window.dispatchEvent(new CustomEvent('sw-request-reload'));
  }, [registration]);

  return { updateAvailable: registration !== null, reload };
}
