import { useCallback } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import type { TranslationKey } from '../i18n/translations';
import { resolveTranslation } from '../i18n/translate';

export type { TranslationKey };

export const useTranslation = () => {
  const { settings } = useSettings();
  const lang = settings.appLanguage;

  const t = useCallback(
    (key: TranslationKey | (string & {}), values?: Record<string, string | number>): string =>
      resolveTranslation(lang, key, values),
    [lang],
  );

  return { t, lang };
};
