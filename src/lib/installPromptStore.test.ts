import { describe, it, expect, vi } from 'vitest';
import {
  getInstallPromptSnapshot,
  setInstallPromptEvent,
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
    expect(spy).toHaveBeenCalled();
    setInstallPromptEvent(null);
    unsub();
  });
});
