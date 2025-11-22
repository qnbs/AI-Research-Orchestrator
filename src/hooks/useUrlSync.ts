
import { useEffect, useRef } from 'react';
import { View } from '../contexts/UIContext';

export const useUrlSync = (
    currentView: View,
    setCurrentView: (view: View) => void
) => {
    const isInitialMount = useRef(true);

    // Sync URL Hash -> State (On Load & PopState)
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.replace('#', '');
            // Basic validation to ensure hash is a valid View
            const validViews: View[] = ['home', 'orchestrator', 'research', 'authors', 'journals', 'knowledgeBase', 'settings', 'help', 'dashboard', 'history'];
            
            if (hash && validViews.includes(hash as View)) {
                // Only update if different to prevent loops
                setCurrentView(hash as View);
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
            } catch (e) {
                try {
                    window.location.hash = `#${currentView}`;
                } catch (e2) {
                    console.debug("Could not update URL hash:", e2);
                }
            }
        }
    }, [currentView]);
};
