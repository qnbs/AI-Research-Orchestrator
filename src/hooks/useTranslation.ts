import { useCallback } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { translations, type TranslationKey } from '../i18n/translations';

export type { TranslationKey };

export const useTranslation = () => {
  const { settings } = useSettings();
  const lang = settings.appLanguage;

  const t = useCallback(
    (key: TranslationKey | (string & {}), values?: Record<string, string | number>): string => {
      const currentLangTranslations = translations[lang];
      const fallbackTranslations = translations['en'];

      let text: string | undefined;
      if (
        currentLangTranslations &&
        Object.prototype.hasOwnProperty.call(currentLangTranslations, key)
      ) {
        text = currentLangTranslations[key as TranslationKey];
      } else if (
        fallbackTranslations &&
        Object.prototype.hasOwnProperty.call(fallbackTranslations, key)
      ) {
        text = fallbackTranslations[key as TranslationKey];
      }

      if (text === undefined) {
        return key;
      }

      if (!values) {
        return text;
      }

      return Object.entries(values).reduce((acc, [k, v]) => {
        return acc.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }, text);
    },
    [lang],
  );

  return { t, lang };
};
