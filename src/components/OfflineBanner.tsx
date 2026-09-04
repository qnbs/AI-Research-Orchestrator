import { useEffect, useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';

export type OfflineBannerProps = {
  /** Injectable for tests; defaults to `navigator.onLine`. */
  getOnline?: () => boolean;
};

/**
 * Compact banner when the browser reports offline. Saved KB and heuristic tools
 * on already fetched reports stay usable; new PubMed/arXiv and live-provider calls do not.
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
    <div role="status" className="px-4 py-2 text-sm text-center banner-warning">
      {t('offline.banner')}
    </div>
  );
}
