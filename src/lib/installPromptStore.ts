import type { BeforeInstallPromptEvent } from '../types/ui';

/**
 * Module store for PWA install state.
 * `BeforeInstallPromptEvent` is non-serializable (must stay out of Redux);
 * `isPwaInstalled` lives here too so both install flags share one subscription.
 */
interface InstallPromptState {
  event: BeforeInstallPromptEvent | null;
  isPwaInstalled: boolean;
}

let state: InstallPromptState = {
  event: null,
  isPwaInstalled: false,
};
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

/** Full snapshot for `useSyncExternalStore` (event + installed flag). */
export function getInstallPromptStateSnapshot(): InstallPromptState {
  return state;
}

/** @deprecated Prefer `getInstallPromptStateSnapshot().event` — kept for existing tests. */
export function getInstallPromptSnapshot(): BeforeInstallPromptEvent | null {
  return state.event;
}

export function setInstallPromptEvent(event: BeforeInstallPromptEvent | null): void {
  if (state.event === event) return;
  state = { ...state, event };
  notify();
}

export function setIsPwaInstalled(isPwaInstalled: boolean): void {
  if (state.isPwaInstalled === isPwaInstalled) return;
  state = { ...state, isPwaInstalled };
  notify();
}

export function subscribeInstallPrompt(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}
