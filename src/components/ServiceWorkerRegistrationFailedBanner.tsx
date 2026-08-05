import { useServiceWorkerRegistrationStatus } from '../hooks/useServiceWorkerRegistrationStatus';
import { useTranslation } from '../hooks/useTranslation';
import { XIcon } from './icons/XIcon';

/**
 * Shown when public/register-sw.js's registration attempt failed (previously
 * a silent no-op - see ADR 0004's 2026-08-05 amendment). Non-blocking and
 * dismissible: live features are unaffected, only offline app-shell support
 * for this session is unavailable.
 */
export function ServiceWorkerRegistrationFailedBanner() {
  const { t } = useTranslation();
  const { registrationFailed, failureReason, dismiss } = useServiceWorkerRegistrationStatus();

  if (!registrationFailed) return null;

  return (
    // <output> carries an implicit "status" ARIA role with better native
    // assistive-tech support than role="status" on a plain <div>.
    <output className="flex flex-wrap items-center justify-center gap-3 px-4 py-2 text-sm text-center banner-info">
      <span>{t('sw.registration.failed', { reason: failureReason ?? 'unknown' })}</span>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t('sw.registration.dismiss')}
        className="p-1 rounded-md hover:bg-surface-hover transition-colors focus-ring-aa"
      >
        <XIcon className="h-4 w-4" />
      </button>
    </output>
  );
}
