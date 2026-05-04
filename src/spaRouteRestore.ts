/**
 * If GitHub Pages (or a proxy) stashed the intended path as `spa-redirect`, restore it after load.
 */
const redirect = sessionStorage.getItem('spa-redirect');
if (redirect) {
  sessionStorage.removeItem('spa-redirect');
  window.history.replaceState(null, '', redirect);
}
