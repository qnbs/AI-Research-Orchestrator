/**
 * Barrel only: navigation & notifications live in Redux (`uiSlice`).
 * PWA install state (non-serializable prompt event + installed flag) lives in
 * `lib/installPromptStore` and is read via `useSyncExternalStore` in `useUI`.
 */
export type { View, BeforeInstallPromptEvent } from '../types/ui';
export { VIEWS, isView } from '../types/ui';
export { useUI } from '../hooks/useUI';
