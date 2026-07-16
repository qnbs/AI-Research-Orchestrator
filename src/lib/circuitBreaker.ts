/**
 * Lightweight per-service circuit breaker for client-side external calls.
 * States: closed → open (after failure threshold) → half-open (after cooldown) → closed.
 */

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerOptions {
  /** Failures in a row before opening. Default 5. */
  failureThreshold?: number;
  /** Cooldown before half-open probe (ms). Default 30_000. */
  cooldownMs?: number;
  /** Successes in half-open needed to close. Default 1. */
  successThreshold?: number;
  now?: () => number;
}

export class CircuitOpenError extends Error {
  readonly service: string;

  constructor(service: string) {
    super(`Circuit open for service: ${service}`);
    this.name = 'CircuitOpenError';
    this.service = service;
  }
}

export class CircuitBreaker {
  private failures = 0;
  private successes = 0;
  private state: CircuitState = 'closed';
  private openedAt = 0;
  private readonly failureThreshold: number;
  private readonly cooldownMs: number;
  private readonly successThreshold: number;
  private readonly now: () => number;

  constructor(
    readonly service: string,
    options: CircuitBreakerOptions = {},
  ) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.cooldownMs = options.cooldownMs ?? 30_000;
    this.successThreshold = options.successThreshold ?? 1;
    this.now = options.now ?? Date.now;
  }

  getState(): CircuitState {
    this.maybeTransitionToHalfOpen();
    return this.state;
  }

  /** Throws CircuitOpenError if the circuit is open. */
  assertClosed(): void {
    if (this.getState() === 'open') {
      throw new CircuitOpenError(this.service);
    }
  }

  recordSuccess(): void {
    if (this.state === 'half-open') {
      this.successes += 1;
      if (this.successes >= this.successThreshold) {
        this.reset();
      }
      return;
    }
    this.failures = 0;
  }

  recordFailure(): void {
    if (this.state === 'half-open') {
      this.trip();
      return;
    }
    this.failures += 1;
    if (this.failures >= this.failureThreshold) {
      this.trip();
    }
  }

  reset(): void {
    this.failures = 0;
    this.successes = 0;
    this.state = 'closed';
    this.openedAt = 0;
  }

  private trip(): void {
    this.state = 'open';
    this.openedAt = this.now();
    this.successes = 0;
  }

  private maybeTransitionToHalfOpen(): void {
    if (this.state !== 'open') return;
    if (this.now() - this.openedAt >= this.cooldownMs) {
      this.state = 'half-open';
      this.successes = 0;
    }
  }
}

const breakers = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(
  service: string,
  options?: CircuitBreakerOptions,
): CircuitBreaker {
  let breaker = breakers.get(service);
  if (!breaker) {
    breaker = new CircuitBreaker(service, options);
    breakers.set(service, breaker);
  }
  return breaker;
}

/** Test helper — clears the shared registry. */
export function resetAllCircuitBreakers(): void {
  breakers.clear();
}

/**
 * Run an async operation guarded by a named circuit breaker.
 */
export async function withCircuitBreaker<T>(
  service: string,
  fn: () => Promise<T>,
  options?: CircuitBreakerOptions,
): Promise<T> {
  const breaker = getCircuitBreaker(service, options);
  breaker.assertClosed();
  try {
    const result = await fn();
    breaker.recordSuccess();
    return result;
  } catch (error) {
    if (error instanceof CircuitOpenError) throw error;
    breaker.recordFailure();
    throw error;
  }
}
