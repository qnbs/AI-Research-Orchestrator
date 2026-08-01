import { describe, it, expect, vi } from 'vitest';
import {
  getInstallPromptSnapshot,
  getInstallPromptStateSnapshot,
  setInstallPromptEvent,
  setIsPwaInstalled,
  subscribeInstallPrompt,
} from './installPromptStore';
import type { BeforeInstallPromptEvent } from '../types/ui';

describe('installPromptStore', () => {
  it('notifies subscribers when event changes', () => {
    const spy = vi.fn();
    const unsub = subscribeInstallPrompt(spy);
    const fake = { preventDefault: vi.fn() } as unknown as BeforeInstallPromptEvent;
    setInstallPromptEvent(fake);
    expect(getInstallPromptSnapshot()).toBe(fake);
    expect(getInstallPromptStateSnapshot().event).toBe(fake);
    expect(spy).toHaveBeenCalled();
    setInstallPromptEvent(null);
    unsub();
  });

  it('notifies subscribers when installed flag changes', () => {
    const spy = vi.fn();
    const unsub = subscribeInstallPrompt(spy);
    setIsPwaInstalled(true);
    expect(getInstallPromptStateSnapshot().isPwaInstalled).toBe(true);
    expect(spy).toHaveBeenCalled();
    setIsPwaInstalled(false);
    unsub();
  });
});
