/**
 * Registers the Workbox service worker with the correct GitHub Pages scope.
 * Kept as an external file so CSP can drop script-src 'unsafe-inline'.
 */
(function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  var path = location.pathname;
  var scope = path.indexOf('/AI-Research-Orchestrator') === 0 ? '/AI-Research-Orchestrator/' : '/';
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
