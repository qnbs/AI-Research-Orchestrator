/**
 * Combines an optional caller AbortSignal with a wall-clock timeout.
 * Aborting either the external signal or the timeout aborts the merged signal.
 * Timeout aborts use `TimeoutError` as `signal.reason` so callers can tell them
 * apart from a user/caller abort (`AbortError`).
 *
 * Call `dispose` when the operation (including response-body consumption)
 * settles so the timer and external listener do not outlive the request.
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
  const ctrl = new AbortController();
  const caller = external ?? null;
  if (caller?.aborted) {
    ctrl.abort(caller.reason);
    return { signal: ctrl.signal, dispose: () => {} };
  }
  let disposed = false;
  const onExternalAbort = () => {
    dispose();
    if (!ctrl.signal.aborted && caller) ctrl.abort(caller.reason);
  };
  function dispose() {
    if (disposed) return;
    disposed = true;
    clearTimeout(timer);
    caller?.removeEventListener('abort', onExternalAbort);
    if (!ctrl.signal.aborted) {
      ctrl.abort(new DOMException('Aborted', 'AbortError'));
    }
  }
  const timer = setTimeout(() => {
    if (disposed) return;
    disposed = true;
    caller?.removeEventListener('abort', onExternalAbort);
    if (!ctrl.signal.aborted) {
      ctrl.abort(new DOMException(`Timeout of ${timeoutMs}ms exceeded`, 'TimeoutError'));
    }
  }, timeoutMs);
  caller?.addEventListener('abort', onExternalAbort, { once: true });
  return { signal: ctrl.signal, dispose };
}
