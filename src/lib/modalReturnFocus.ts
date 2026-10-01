/** Captured synchronously before opening an overlay so inert/backdrop cannot steal activeElement. */
let pendingReturnFocus: HTMLElement | null = null;

export function captureModalReturnFocus(target: EventTarget | null): void {
  pendingReturnFocus = target instanceof HTMLElement ? target : null;
}

export function consumeModalReturnFocus(): HTMLElement | null {
  const target = pendingReturnFocus;
  pendingReturnFocus = null;
  return target;
}
