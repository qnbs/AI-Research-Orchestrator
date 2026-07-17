import { useCallback, useEffect, useState } from 'react';
import { useAppSelector } from '../store/hooks';
import {
  resolveActiveInferenceMode,
  inferenceModeBadgeLabel,
  isZeroCostMode,
  type InferenceModeSnapshot,
} from '../services/resolveActiveInferenceMode';
import { hasApiKey } from '../services/apiKeyService';

/**
 * Subscribes to online/offline events and settings to expose the active inference mode.
 */
export function useInferenceMode(): InferenceModeSnapshot & {
  badgeLabel: string;
  isZeroCost: boolean;
  refresh: () => Promise<void>;
} {
  const forceHeuristic = useAppSelector((s) => s.settings.data.ai.forceHeuristicMode ?? false);
  const [snapshot, setSnapshot] = useState<InferenceModeSnapshot>({
    mode: 'heuristic',
    reason: 'no_api_key',
    hasApiKey: false,
    isOnline: typeof navigator === 'undefined' ? true : navigator.onLine,
    forceHeuristic,
  });

  const refresh = useCallback(async () => {
    const next = await resolveActiveInferenceMode({
      forceHeuristic,
      checkApiKey: hasApiKey,
      getOnline: () => (typeof navigator === 'undefined' ? true : navigator.onLine),
    });
    setSnapshot(next);
  }, [forceHeuristic]);

  useEffect(() => {
    void refresh();
    const onChange = () => {
      void refresh();
    };
    window.addEventListener('online', onChange);
    window.addEventListener('offline', onChange);
    return () => {
      window.removeEventListener('online', onChange);
      window.removeEventListener('offline', onChange);
    };
  }, [refresh]);

  return {
    ...snapshot,
    badgeLabel: inferenceModeBadgeLabel(snapshot),
    isZeroCost: isZeroCostMode(snapshot),
    refresh,
  };
}
