import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppSelector } from '../store/hooks';
import {
  resolveActiveInferenceMode,
  inferenceModeBadgeLabel,
  isZeroCostMode,
  type InferenceModeSnapshot,
} from '../services/resolveActiveInferenceMode';
import { hasProviderApiKey } from '../services/apiKeyService';

/**
 * Subscribes to online/offline events and settings to expose the active inference mode.
 */
export function useInferenceMode(): InferenceModeSnapshot & {
  badgeLabel: string;
  isZeroCost: boolean;
  refresh: () => Promise<void>;
} {
  const ai = useAppSelector((s) => s.settings.data.ai);
  const forceHeuristic = ai.forceHeuristicMode ?? false;
  const provider = ai.provider ?? 'gemini';
  const [snapshot, setSnapshot] = useState<InferenceModeSnapshot>({
    mode: 'heuristic',
    reason: 'no_api_key',
    hasApiKey: false,
    isOnline: typeof navigator === 'undefined' ? true : navigator.onLine,
    forceHeuristic,
    provider,
  });
  const requestIdRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    // Heuristic mode does not require an API key; skip key check for it.
    const keyCheckProvider = provider === 'heuristic' ? null : provider;
    const next = await resolveActiveInferenceMode({
      forceHeuristic,
      provider,
      checkApiKey: keyCheckProvider ? () => hasProviderApiKey(keyCheckProvider) : async () => false,
      getOnline: () => (typeof navigator === 'undefined' ? true : navigator.onLine),
    });
    if (requestId !== requestIdRef.current) return;
    setSnapshot(next);
  }, [forceHeuristic, provider]);

  useEffect(() => {
    void refresh();
    const onChange = () => {
      void refresh();
    };
    window.addEventListener('online', onChange);
    window.addEventListener('offline', onChange);
    window.addEventListener('aro-api-key-changed', onChange);
    return () => {
      requestIdRef.current += 1;
      window.removeEventListener('online', onChange);
      window.removeEventListener('offline', onChange);
      window.removeEventListener('aro-api-key-changed', onChange);
    };
  }, [refresh]);

  return {
    ...snapshot,
    badgeLabel: inferenceModeBadgeLabel(snapshot),
    isZeroCost: isZeroCostMode(snapshot),
    refresh,
  };
}
