/** Injected at build time via Vite `define` (see vite.config.ts). */
declare const __APP_VERSION__: string;
declare const __BUILD_COMMIT_SHA__: string;

interface Window {
  /** Set by public/register-sw.js on a failed SW registration; see useServiceWorkerRegistrationStatus. */
  __swRegistrationFailedReason?: string;
}
