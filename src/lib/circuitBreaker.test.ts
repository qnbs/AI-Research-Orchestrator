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

  it('does not open when failures stay below threshold', () => {
    const breaker = new CircuitBreaker('below-threshold', { failureThreshold: 3 });
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.getState()).toBe('closed');
    expect(() => breaker.assertClosed()).not.toThrow();
  });

  it('recordSuccess while closed resets the failure counter', () => {
    const breaker = new CircuitBreaker('recover', { failureThreshold: 2 });
    breaker.recordFailure();
    breaker.recordSuccess();
    breaker.recordFailure();
    expect(breaker.getState()).toBe('closed');
  });

  it('reset() clears failures/successes and returns to closed', () => {
    const breaker = new CircuitBreaker('resettable', { failureThreshold: 1 });
    breaker.recordFailure();
    expect(breaker.getState()).toBe('open');
    breaker.reset();
    expect(breaker.getState()).toBe('closed');
    expect(() => breaker.assertClosed()).not.toThrow();
  });

  it('CircuitOpenError carries the service name in message and property', () => {
    const breaker = new CircuitBreaker('named-service', { failureThreshold: 1 });
    breaker.recordFailure();
    try {
      breaker.assertClosed();
      expect.unreachable('assertClosed should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(CircuitOpenError);
      expect((err as CircuitOpenError).service).toBe('named-service');
      expect((err as Error).message).toContain('named-service');
    }
  });

  it('getCircuitBreaker returns the same instance for a given service', () => {
    const first = getCircuitBreaker('shared-service', { failureThreshold: 2 });
    const second = getCircuitBreaker('shared-service', { failureThreshold: 99 });
    expect(second).toBe(first);
    first.recordFailure();
    expect(first.getState()).toBe('closed');
    first.recordFailure();
    expect(first.getState()).toBe('open');
  });

  it('requires successThreshold successes before closing from half-open', () => {
    let t = 0;
    const breaker = new CircuitBreaker('multi-success', {
      failureThreshold: 1,
      cooldownMs: 10,
      successThreshold: 2,
      now: () => t,
    });
    breaker.recordFailure();
    t = 20;
    expect(breaker.getState()).toBe('half-open');
    breaker.recordSuccess();
    expect(breaker.getState()).toBe('half-open');
    breaker.recordSuccess();
    expect(breaker.getState()).toBe('closed');
  });
});
