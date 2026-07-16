import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CircuitBreaker,
  CircuitOpenError,
  getCircuitBreaker,
  resetAllCircuitBreakers,
  withCircuitBreaker,
} from './circuitBreaker';

describe('CircuitBreaker', () => {
  beforeEach(() => {
    resetAllCircuitBreakers();
  });

  it('opens after failure threshold and blocks calls', () => {
    const now = vi.fn(() => 1_000);
    const breaker = new CircuitBreaker('gemini', {
      failureThreshold: 2,
      cooldownMs: 5_000,
      now,
    });

    breaker.recordFailure();
    expect(breaker.getState()).toBe('closed');
    breaker.recordFailure();
    expect(breaker.getState()).toBe('open');
    expect(() => breaker.assertClosed()).toThrow(CircuitOpenError);
  });

  it('transitions to half-open after cooldown then closes on success', () => {
    let t = 0;
    const breaker = new CircuitBreaker('pubmed', {
      failureThreshold: 1,
      cooldownMs: 100,
      now: () => t,
    });

    breaker.recordFailure();
    expect(breaker.getState()).toBe('open');
    t = 150;
    expect(breaker.getState()).toBe('half-open');
    breaker.recordSuccess();
    expect(breaker.getState()).toBe('closed');
  });

  it('re-opens on half-open failure', () => {
    let t = 0;
    const breaker = new CircuitBreaker('arxiv', {
      failureThreshold: 1,
      cooldownMs: 50,
      now: () => t,
    });
    breaker.recordFailure();
    t = 100;
    expect(breaker.getState()).toBe('half-open');
    breaker.recordFailure();
    expect(breaker.getState()).toBe('open');
  });

  it('withCircuitBreaker records success and failure', async () => {
    const ok = await withCircuitBreaker('test-ok', async () => 42, { failureThreshold: 1 });
    expect(ok).toBe(42);
    expect(getCircuitBreaker('test-ok').getState()).toBe('closed');

    await expect(
      withCircuitBreaker(
        'test-fail',
        async () => {
          throw new Error('fail');
        },
        { failureThreshold: 1 },
      ),
    ).rejects.toThrow('fail');
    expect(getCircuitBreaker('test-fail').getState()).toBe('open');

    await expect(
      withCircuitBreaker('test-fail', async () => 1, { failureThreshold: 1 }),
    ).rejects.toThrow(CircuitOpenError);
  });
});
