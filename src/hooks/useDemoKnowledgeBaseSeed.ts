import { useEffect } from 'react';
import type { AppDispatch } from '../store/store';
import { importKbEntries } from '../store/slices/knowledgeBaseSlice';
import {
  createDemoKnowledgeBaseEntries,
  DEMO_DISMISS_STORAGE_KEY,
  DEMO_SEEDED_STORAGE_KEY,
} from '../services/nonAi';

/**
 * First-run only: seed educational demo KB entries when empty and never seeded/dismissed.
 */
export function useDemoKnowledgeBaseSeed(
  dispatch: AppDispatch,
  isLoading: boolean,
  entryCount: number,
): void {
  useEffect(() => {
    if (isLoading) return;
    if (entryCount > 0) return;
    let dismissed = false;
    let alreadySeeded = false;
    try {
      dismissed = localStorage.getItem(DEMO_DISMISS_STORAGE_KEY) === '1';
      alreadySeeded = localStorage.getItem(DEMO_SEEDED_STORAGE_KEY) === '1';
    } catch {
      dismissed = false;
      alreadySeeded = false;
    }
    if (dismissed || alreadySeeded) return;
    const demo = createDemoKnowledgeBaseEntries();
    void dispatch(importKbEntries(demo))
      .unwrap()
      .then(() => {
        try {
          localStorage.setItem(DEMO_SEEDED_STORAGE_KEY, '1');
        } catch {
          /* ignore quota / private mode */
        }
      })
      .catch(() => {
        // Leave seeded flag unset so a later mount can retry.
      });
  }, [dispatch, isLoading, entryCount]);
}

/** Persist flags so an intentional KB clear does not reseed demo data. */
export function markDemoSeedConsumed(): void {
  try {
    localStorage.setItem(DEMO_SEEDED_STORAGE_KEY, '1');
    localStorage.setItem(DEMO_DISMISS_STORAGE_KEY, '1');
  } catch {
    /* ignore */
  }
}
