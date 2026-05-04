/**
 * Combines an optional caller AbortSignal with a wall-clock timeout.
 * Aborting either the external signal or the timeout aborts the merged signal.
 */
export function combineAbortSignals(timeoutMs: number, external?: AbortSignal | null): AbortSignal {
  if (!external) return AbortSignal.timeout(timeoutMs);
  const ctrl = new AbortController();
  const abort = () => ctrl.abort();
  const timer = setTimeout(abort, timeoutMs);
  external.addEventListener('abort', () => {
    clearTimeout(timer);
    abort();
  });
  return ctrl.signal;
}
