/** Route / shell view ids (navigation state lives in Redux: `uiSlice`). */
export const VIEWS = [
  'home',
  'orchestrator',
  'research',
  'authors',
  'journals',
  'knowledgeBase',
  'settings',
  'help',
  'dashboard',
  'history',
  'collections',
] as const;

export type View = (typeof VIEWS)[number];

export function isView(value: string): value is View {
  return (VIEWS as readonly string[]).includes(value);
}

/** Chromium `beforeinstallprompt` event — not serializable; kept outside Redux. */
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}
