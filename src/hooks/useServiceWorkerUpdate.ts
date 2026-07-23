import { useCallback, useEffect, useState } from 'react';

/**
 * Bridges public/register-sw.js's "sw-update-available" window CustomEvent
 * (dispatched when a new service worker has installed alongside an already
 * active one) into React state, and exposes reload() to post SKIP_WAITING to
 * the waiting worker - it activates, the page's controllerchange listener
 * (also in register-sw.js) reloads once.
 */
export function useServiceWorkerUpdate() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    const onUpdateAvailable = (event: Event) => {
      const detail = (event as CustomEvent<{ registration: ServiceWorkerRegistration }>).detail;
      if (detail?.registration) setRegistration(detail.registration);
    };
    window.addEventListener('sw-update-available', onUpdateAvailable);
    return () => window.removeEventListener('sw-update-available', onUpdateAvailable);
  }, []);

  const reload = useCallback(() => {
    registration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
  }, [registration]);

  return { updateAvailable: registration !== null, reload };
}
