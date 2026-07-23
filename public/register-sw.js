/**
 * Registers the Workbox service worker with the correct GitHub Pages scope.
 * Kept as an external file so CSP can drop script-src 'unsafe-inline'.
 * Scope must match public/sw.js BASE_PATH derivation from the worker URL.
 *
 * Update flow: dispatches a window "sw-update-available" CustomEvent once a
 * new worker has installed alongside an already-active one (i.e. this is a
 * real update, not the first install) - src/hooks/useServiceWorkerUpdate.ts
 * listens for it to show UpdateAvailableBanner. The banner's "Reload" button
 * posts SKIP_WAITING to the waiting worker; once it activates and becomes
 * the controller, this reloads the page exactly once via `reloaded`.
 */
(function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  var path = location.pathname;
  var scope = path.indexOf('/AI-Research-Orchestrator') === 0 ? '/AI-Research-Orchestrator/' : '/';
  // Vite copies public/sw.js → dist/sw.js (or dist/<base>/ via base href).
  var swUrl = scope + 'sw.js';
  var reloaded = false;

  window.addEventListener('load', function () {
    navigator.serviceWorker.register(swUrl, { scope: scope }).then(function (registration) {
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
    });

    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });
  });
})();
