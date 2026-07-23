/**
 * Registers the Workbox service worker with the correct GitHub Pages scope.
 * Kept as an external file so CSP can drop script-src 'unsafe-inline'.
 * Scope must match public/sw.js BASE_PATH derivation from the worker URL.
 *
 * Update flow: dispatches a window "sw-update-available" CustomEvent once a
 * new worker has installed alongside an already-active one (i.e. this is a
 * real update, not the first install) - src/hooks/useServiceWorkerUpdate.ts
 * listens for it to show UpdateAvailableBanner. Its "Reload" button dispatches
 * "sw-request-reload", which just posts SKIP_WAITING to the waiting worker.
 *
 * Reload gating: `hadControllerAtLoad` (snapshotted once, unconditionally, at
 * "load") - NOT "did this tab request the reload" - decides whether THIS
 * tab's controllerchange reloads it. Two things fire controllerchange and
 * must be told apart:
 *   1. A page's very first, uncontrolled -> controlled transition
 *      (clientsClaim() taking over a page with no service worker at all yet)
 *      - hadControllerAtLoad is false there, so this must NOT reload (an
 *        unconditional reload here hits every user's first-ever visit).
 *   2. A genuine version swap - clientsClaim() then fires controllerchange in
 *      *every* open, same-origin, already-controlled tab, not only the tab
 *      that clicked "Reload". A tab whose own reload-worthiness depended on
 *      "did I personally dispatch sw-request-reload" would stay silently
 *      taken over by the new worker's fetch handlers while still running the
 *      old JS bundle in memory - the exact bug class this file exists to
 *      avoid, just reintroduced for every tab other than the initiating one.
 * hadControllerAtLoad is true for every tab that was already under some
 * service worker's control when it loaded, which is exactly the set of tabs
 * for which any later controllerchange can only be case 2, never case 1 -
 * so gating on it (rather than on who clicked the button) correctly reloads
 * every affected tab while still skipping the first-ever-visit transition.
 */
(function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  var path = location.pathname;
  var scope = path.indexOf('/AI-Research-Orchestrator') === 0 ? '/AI-Research-Orchestrator/' : '/';
  // Vite copies public/sw.js → dist/sw.js (or dist/<base>/ via base href).
  var swUrl = scope + 'sw.js';
  var reloaded = false;
  var hadControllerAtLoad = false;
  var currentRegistration = null;

  window.addEventListener('load', function () {
    hadControllerAtLoad = Boolean(navigator.serviceWorker.controller);

    navigator.serviceWorker.register(swUrl, { scope: scope }).then(function (registration) {
      currentRegistration = registration;

      function notifyWaiting() {
        if (!registration.waiting) return;
        window.dispatchEvent(
          new CustomEvent('sw-update-available', { detail: { registration: registration } }),
        );
      }

      // A worker may already be waiting from before this page load.
      notifyWaiting();

      registration.addEventListener('updatefound', function () {
        var installing = registration.installing;
        if (!installing) return;
        installing.addEventListener('statechange', function () {
          // `installed` + an existing controller means this replaces an
          // already-active worker - a genuine update, not the first install.
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            notifyWaiting();
          }
        });
      });
    }).catch(function () {
      // Registration can legitimately fail (browser policy, bad scope,
      // network failure fetching sw.js) - absorb it rather than leaving an
      // unhandled promise rejection. sw-integrity.test.ts asserts this file
      // never logs, so this stays a silent no-op rather than console.*.
      return undefined;
    });

    window.addEventListener('sw-request-reload', function () {
      if (!currentRegistration || !currentRegistration.waiting) return;
      currentRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    });

    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (reloaded || !hadControllerAtLoad) return;
      reloaded = true;
      window.location.reload();
    });
  });
})();
