/**
 * Combines an optional caller AbortSignal with a wall-clock timeout.
 * Aborting either the external signal or the timeout aborts the merged signal.
 * Timeout aborts use `TimeoutError` as `signal.reason` so callers can tell them
 * apart from a user/caller abort (`AbortError`).
 *
 * Call `dispose` when the operation settles so the timer and external
 * listener do not outlive a successful request.
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

export type CombinedAbortSignal = {
  signal: AbortSignal;
  dispose: () => void;
};

export function combineAbortSignals(
  timeoutMs: number,
  external?: AbortSignal | null,
): CombinedAbortSignal {
  if (!external) {
    return { signal: AbortSignal.timeout(timeoutMs), dispose: () => {} };
  }
  const ctrl = new AbortController();
  if (external.aborted) {
    ctrl.abort(external.reason);
    return { signal: ctrl.signal, dispose: () => {} };
  }
  let disposed = false;
  const onExternalAbort = () => {
    dispose();
    if (!ctrl.signal.aborted) ctrl.abort(external.reason);
  };
  function dispose() {
    if (disposed) return;
    disposed = true;
    clearTimeout(timer);
    external.removeEventListener('abort', onExternalAbort);
  }
  const timer = setTimeout(() => {
    dispose();
    if (!ctrl.signal.aborted) {
      ctrl.abort(new DOMException(`Timeout of ${timeoutMs}ms exceeded`, 'TimeoutError'));
    }
  }, timeoutMs);
  external.addEventListener('abort', onExternalAbort, { once: true });
  return { signal: ctrl.signal, dispose };
}
