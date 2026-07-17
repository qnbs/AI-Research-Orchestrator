import { useEffect, useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';

export type OfflineBannerProps = {
  /** Injectable for tests; defaults to `navigator.onLine`. */
  getOnline?: () => boolean;
};

/**
 * Compact banner when the browser reports offline. Saved reports remain in Dexie;
 * this only signals that live PubMed/Gemini calls will fail.
 */
export function OfflineBanner({ getOnline = () => navigator.onLine }: OfflineBannerProps = {}) {
  const { t } = useTranslation();
  const [offline, setOffline] = useState(() => !getOnline());

  useEffect(() => {
    const sync = () => setOffline(!getOnline());
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    sync();
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, [getOnline]);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="px-4 py-2 text-sm text-center bg-amber-500/15 text-amber-200 border-b border-amber-500/30"
    >
      {t('offline.banner')}
    </div>
  );
}
