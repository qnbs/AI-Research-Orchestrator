/**
 * Registers the Workbox service worker with the correct GitHub Pages scope.
 * Kept as an external file so CSP can drop script-src 'unsafe-inline'.
 * Scope must match public/sw.js BASE_PATH derivation from the worker URL.
 */
(function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  var path = location.pathname;
  var scope = path.indexOf('/AI-Research-Orchestrator') === 0 ? '/AI-Research-Orchestrator/' : '/';
  // Vite copies public/sw.js → dist/sw.js (or dist/<base>/ via base href).
  var swUrl = scope + 'sw.js';

  window.addEventListener('load', function () {
    navigator.serviceWorker
      .register(swUrl, { scope: scope })
      .then(function (registration) {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch(function (error) {
        console.log('ServiceWorker registration failed: ', error);
      });
  });
})();
