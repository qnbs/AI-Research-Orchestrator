import type { ReactNode } from 'react';
import { SettingsHydrator, useSettings } from '../hooks/useSettings';

/** Hydrates Redux from IndexedDB once; children need no extra provider logic. */
export const SettingsProvider = ({ children }: { children: ReactNode }) => (
  <>
    <SettingsHydrator />
    {children}
  </>
);

export { useSettings };
