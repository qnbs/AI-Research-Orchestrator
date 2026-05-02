/** Route / shell view ids (navigation state lives in Redux: `uiSlice`). */
export type View =
  | 'home'
  | 'orchestrator'
  | 'research'
  | 'authors'
  | 'journals'
  | 'knowledgeBase'
  | 'settings'
  | 'help'
  | 'dashboard'
  | 'history'
  | 'collections';

/** Chromium `beforeinstallprompt` event — not serializable; kept outside Redux. */
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}
