/**
 * Registers the Workbox service worker with the correct GitHub Pages scope.
 * Kept as an external file so CSP can drop script-src 'unsafe-inline'.
 * Scope must match public/sw.js BASE_PATH derivation from the worker URL.
 *
 * Update flow: dispatches a window "sw-update-available" CustomEvent once a
 * new worker has installed alongside an already-active one (i.e. this is a
 * real update, not the first install) - src/hooks/useServiceWorkerUpdate.ts
 * listens for it to show UpdateAvailableBanner. Its "Reload" button dispatches
 * "sw-request-reload" rather than posting to the worker directly, so this
 * script - not the React layer - decides whether the resulting controllerchange
 * should reload the page. That matters: controllerchange also fires on a
 * page's very first, uncontrolled -> controlled transition (clientsClaim()
 * taking over a page that had no service worker yet at all), not only on a
 * genuine version swap - reloading on that fires an unwanted reload on every
 * user's first-ever visit. Only a controllerchange caused by an explicit
 * "sw-request-reload" is honored.
 */
(function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  var path = location.pathname;
  var scope = path.indexOf('/AI-Research-Orchestrator') === 0 ? '/AI-Research-Orchestrator/' : '/';
  // Vite copies public/sw.js → dist/sw.js (or dist/<base>/ via base href).
  var swUrl = scope + 'sw.js';
  var reloaded = false;
  var willReloadOnControllerChange = false;
  var currentRegistration = null;

  window.addEventListener('load', function () {
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
      willReloadOnControllerChange = true;
      currentRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    });

    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (reloaded || !willReloadOnControllerChange) return;
      reloaded = true;
      window.location.reload();
    });
  });
})();
