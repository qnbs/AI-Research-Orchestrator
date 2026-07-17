import { useCallback } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { translations, type TranslationKey } from '../i18n/translations';

export type { TranslationKey };

export const useTranslation = () => {
  const { settings } = useSettings();
  const lang = settings.appLanguage;

  const t = useCallback(
    (key: TranslationKey | (string & {})): string => {
      const currentLangTranslations = translations[lang];
      const fallbackTranslations = translations['en'];

      if (
        currentLangTranslations &&
        Object.prototype.hasOwnProperty.call(currentLangTranslations, key)
      ) {
        return currentLangTranslations[key as TranslationKey];
      }

      if (fallbackTranslations && Object.prototype.hasOwnProperty.call(fallbackTranslations, key)) {
        return fallbackTranslations[key as TranslationKey];
      }

      return key;
    },
    [lang],
  );

  return { t, lang };
};
