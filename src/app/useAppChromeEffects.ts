import { useEffect } from 'react';
import { useAppDispatch } from '../store/hooks';
import { loadCollections } from '../store/slices/collectionsSlice';
import { setVaultResetListener } from '../services/apiKeyService';
import { setNotification as setNotificationAction } from '../store/slices/uiSlice';
import { getLatestResearchCheckpoints } from '../services/databaseService';
import type { ResearchCheckpoint } from '../lib/researchCheckpoint';
import type { ReportStatus } from '../types';
import type { View, BeforeInstallPromptEvent } from '../types/ui';
import type { TranslationKey } from '../i18n/translations';
import { useUrlSync } from '../hooks/useUrlSync';
import { safeLogError } from '../lib/safeLog';

interface UseAppChromeEffectsArgs {
  currentView: View;
  setCurrentView: (view: View) => void;
  setIsCommandPaletteOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
  setInstallPromptEvent: (event: BeforeInstallPromptEvent | null) => void;
  setIsPwaInstalled: (installed: boolean) => void;
  t: (key: TranslationKey | (string & {}), values?: Record<string, string | number>) => string;
  selectedKbPmidsLength: number;
  clearSelectedKbPmids: () => void;
  reportStatus: ReportStatus;
  checkpointRefreshToken: number;
  setResumeCheckpoints: (checkpoints: ResearchCheckpoint[]) => void;
}

/**
 * App-level lifecycle effects: URL sync, collections hydrate, vault-reset
 * listener, document title, ⌘K, PWA install, KB selection clear, checkpoint load.
 */
export function useAppChromeEffects({
  currentView,
  setCurrentView,
  setIsCommandPaletteOpen,
  setInstallPromptEvent,
  setIsPwaInstalled,
  t,
  selectedKbPmidsLength,
  clearSelectedKbPmids,
  reportStatus,
  checkpointRefreshToken,
  setResumeCheckpoints,
}: UseAppChromeEffectsArgs): void {
  useUrlSync(currentView, setCurrentView);

  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(loadCollections());
  }, [dispatch]);

  // apiKeyService.ts has no dependency on the Redux store (avoids an import
  // cycle back through geminiService.ts, which imports it for getNcbiApiKey).
  // It notifies of a rare pre-hardening vault reset via this registered
  // callback instead, set up once here where dispatch/t are already
  // available. Dispatches via dispatch(setNotificationAction(...)) directly
  // rather than useUI()'s setNotification wrapper: that wrapper's identity
  // changes on every unrelated ui-slice update (nav, command palette, …),
  // which would re-run this effect far more than "once" — dispatch itself is
  // Redux's stable reference, so this only re-registers when the translation
  // function changes (i.e. on language change).
  useEffect(() => {
    setVaultResetListener(() =>
      dispatch(
        setNotificationAction({
          id: Date.now(),
          message: t('settings.apiKeyVaultReset.message'),
          type: 'error',
        }),
      ),
    );
    return () => setVaultResetListener(null);
  }, [dispatch, t]);

  useEffect(() => {
    const viewTitles: Record<View, string> = {
      home: t('nav.home'),
      orchestrator: t('nav.orchestrator'),
      research: t('nav.research'),
      authors: t('nav.authors'),
      journals: t('nav.journals'),
      knowledgeBase: t('nav.knowledgeBase'),
      dashboard: t('nav.dashboard'),
      history: t('nav.history'),
      settings: t('nav.settings'),
      help: t('nav.help'),
      collections: t('nav.collections') || 'Collections',
    };
    document.title = `${viewTitles[currentView] || t('nav.research')} | ${t('app.name')}`;
  }, [currentView, t]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsCommandPaletteOpen]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
      setIsPwaInstalled(false);
    };

    const handleAppInstalled = () => {
      setInstallPromptEvent(null);
      setIsPwaInstalled(true);
    };

    // iOS Safari exposes a non-standard `navigator.standalone` flag not in lib.dom.d.ts.
    const nav = window.navigator as Navigator & { standalone?: boolean };
    if (window.matchMedia('(display-mode: standalone)').matches || nav.standalone) {
      setIsPwaInstalled(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [setInstallPromptEvent, setIsPwaInstalled]);

  useEffect(() => {
    if (currentView !== 'knowledgeBase' && selectedKbPmidsLength > 0) {
      clearSelectedKbPmids();
    }
  }, [currentView, selectedKbPmidsLength, clearSelectedKbPmids]);

  useEffect(() => {
    if (
      currentView !== 'orchestrator' ||
      reportStatus === 'generating' ||
      reportStatus === 'streaming'
    ) {
      return;
    }
    let cancelled = false;
    const loadCheckpoints = async () => {
      try {
        const latest = await getLatestResearchCheckpoints(10);
        if (!cancelled) setResumeCheckpoints(latest);
      } catch (err) {
        safeLogError('Failed to load research checkpoints', err);
        if (!cancelled) setResumeCheckpoints([]);
      }
    };
    loadCheckpoints().catch((err) => {
      safeLogError('Failed to load research checkpoints', err);
    });
    return () => {
      cancelled = true;
    };
  }, [currentView, reportStatus, checkpointRefreshToken, setResumeCheckpoints]);
}
