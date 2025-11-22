
import { useCallback } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { translations } from '../i18n/translations';

export const useTranslation = () => {
    const { settings } = useSettings();
    const lang = settings.appLanguage;

    const t = useCallback((key: string): string => {
        const currentLangTranslations = translations[lang];
        const fallbackTranslations = translations['en'];

        if (currentLangTranslations && key in currentLangTranslations) {
            return currentLangTranslations[key as keyof typeof currentLangTranslations];
        }

        if (fallbackTranslations && key in fallbackTranslations) {
            return fallbackTranslations[key as keyof typeof fallbackTranslations];
        }

        return key;
    }, [lang]);

    return { t, lang };
};
