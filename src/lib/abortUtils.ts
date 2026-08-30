/**
 * Combines an optional caller AbortSignal with a wall-clock timeout.
 * Aborting either the external signal or the timeout aborts the merged signal.
 * Timeout aborts use `TimeoutError` as `signal.reason` so callers can tell them
 * apart from a user/caller abort (`AbortError`).
 */
export function isAbortLikeError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (error instanceof Error && error.name === 'AbortError') return true;
  return false;
}

/** True when an AbortSignal (or thrown reason) is a wall-clock timeout. */
export function isTimeoutAbortReason(reason: unknown): boolean {
  if (!reason || typeof reason !== 'object') return false;
  return 'name' in reason && reason.name === 'TimeoutError';
}

export function combineAbortSignals(timeoutMs: number, external?: AbortSignal | null): AbortSignal {
  if (!external) return AbortSignal.timeout(timeoutMs);
  const ctrl = new AbortController();
  if (external.aborted) {
    ctrl.abort(external.reason);
    return ctrl.signal;
  }
  const timer = setTimeout(() => {
    ctrl.abort(new DOMException(`Timeout of ${timeoutMs}ms exceeded`, 'TimeoutError'));
  }, timeoutMs);
  external.addEventListener(
    'abort',
    () => {
      clearTimeout(timer);
      if (!ctrl.signal.aborted) ctrl.abort(external.reason);
    },
    { once: true },
  );
  return ctrl.signal;
}
