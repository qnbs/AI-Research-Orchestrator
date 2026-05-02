import type { BeforeInstallPromptEvent } from '../types/ui';

let current: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

export function getInstallPromptSnapshot(): BeforeInstallPromptEvent | null {
  return current;
}

export function setInstallPromptEvent(event: BeforeInstallPromptEvent | null): void {
  current = event;
  listeners.forEach((l) => l());
}

export function subscribeInstallPrompt(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}
