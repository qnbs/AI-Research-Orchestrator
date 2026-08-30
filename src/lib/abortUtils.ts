/**
 * Combines an optional caller AbortSignal with a wall-clock timeout.
 * Aborting either the external signal or the timeout aborts the merged signal.
 */
export function isAbortLikeError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (error instanceof Error && error.name === 'AbortError') return true;
  return false;
}

export function combineAbortSignals(timeoutMs: number, external?: AbortSignal | null): AbortSignal {
  if (!external) return AbortSignal.timeout(timeoutMs);
  const ctrl = new AbortController();
  const abort = () => ctrl.abort();
  if (external.aborted) {
    abort();
    return ctrl.signal;
  }
  const timer = setTimeout(abort, timeoutMs);
  external.addEventListener('abort', () => {
    clearTimeout(timer);
    abort();
  });
  return ctrl.signal;
}
