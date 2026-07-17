import { useEffect, useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';

/**
 * Compact banner when the browser reports offline. Saved reports remain in Dexie;
 * this only signals that live PubMed/Gemini calls will fail.
 */
export function OfflineBanner() {
  const { t } = useTranslation();
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

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
