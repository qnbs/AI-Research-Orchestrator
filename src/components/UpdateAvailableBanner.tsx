import { useServiceWorkerUpdate } from '../hooks/useServiceWorkerUpdate';
import { useTranslation } from '../hooks/useTranslation';

/**
 * Shown when a new service worker has installed and is waiting to activate.
 * "Reload" posts SKIP_WAITING to it (see public/sw.js's message listener);
 * the resulting controllerchange reloads the page once (public/register-sw.js).
 */
export function UpdateAvailableBanner() {
  const { t } = useTranslation();
  const { updateAvailable, reload } = useServiceWorkerUpdate();

  if (!updateAvailable) return null;

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-center gap-3 px-4 py-2 text-sm text-center banner-info"
    >
      <span>{t('sw.update.available')}</span>
      <button
        type="button"
        onClick={reload}
        className="text-xs px-2.5 py-1 rounded-md bg-brand-accent/15 text-brand-accent border border-brand-accent/30 hover:bg-brand-accent/25 transition-colors"
      >
        {t('sw.update.reload')}
      </button>
    </div>
  );
}
