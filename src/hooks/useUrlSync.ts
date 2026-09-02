import { useEffect, useRef } from 'react';
import { isView, type View } from '../types/ui';

export const useUrlSync = (currentView: View, setCurrentView: (view: View) => void) => {
  const isInitialMount = useRef(true);
  const isInitialStateSync = useRef(true);

  // Sync URL Hash -> State (On Load & PopState)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && isView(hash)) {
        // Only update if different to prevent loops
        setCurrentView(hash);
      } else if (!hash) {
        setCurrentView('home');
      }
    };

    if (isInitialMount.current) {
      handleHashChange();
      isInitialMount.current = false;
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [setCurrentView]);

  // Sync State -> URL Hash
  useEffect(() => {
    if (isInitialStateSync.current) {
      // Skip on the very first commit: the hash->state effect above (running in
      // this same initial commit) is the source of truth for a deep-linked URL.
      // currentView here still reflects the pre-hydration value from this
      // render's closure - pushing it now would race that effect's dispatch and
      // insert a spurious history entry (e.g. #home) before the real view
      // settles, breaking Back navigation on a fresh #<view> deep link.
      isInitialStateSync.current = false;
      return;
    }

    const currentHash = window.location.hash.replace('#', '');
    if (currentHash !== currentView) {
      // In blob environments (like AI Studio) or sandboxes, pushState is often blocked for security.
      if (window.location.protocol === 'blob:') {
        try {
          // Use replaceState to avoid cluttering history in sandbox if hash logic fails
          window.history.replaceState(null, '', `#${currentView}`);
        } catch (e) {
          // Ignore
        }
        return;
      }

      try {
        window.history.pushState(null, '', `#${currentView}`);
      } catch {
        try {
          window.location.hash = `#${currentView}`;
        } catch {
          // Silently ignore URL hash update failures
        }
      }
    }
  }, [currentView]);
};
