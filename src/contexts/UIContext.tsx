/**
 * Barrel only: navigation & notifications live in Redux (`uiSlice`).
 * PWA install prompt is non-serializable → `lib/installPromptStore` + `useSyncExternalStore` in `useUI`.
 */
export type { View, BeforeInstallPromptEvent } from '../types/ui';
export { useUI } from '../hooks/useUI';
