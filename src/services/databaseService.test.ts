import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db, getSettings, saveSettings } from './databaseService';
import { defaultSettings } from '../store/slices/settingsSlice';

describe('databaseService settings IO', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('saveSettings round-trips', async () => {
    const next = { ...defaultSettings, appLanguage: 'de' as const };
    await saveSettings(next);
    const loaded = await getSettings();
    expect(loaded?.appLanguage).toBe('de');
  });
});
