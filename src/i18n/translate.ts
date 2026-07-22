import { translations, type TranslationKey } from './translations';
import type { AppLanguage } from '../types';
import { store } from '../store/store';

/** Framework-free lookup/interpolation core, shared by useTranslation() and translateSync(). */
export function resolveTranslation(
  lang: AppLanguage,
  key: TranslationKey | (string & {}),
  values?: Record<string, string | number>,
): string {
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
}

/**
 * Current UI language, read lazily from the Redux store.
 *
 * IMPORTANT: `store.getState()` is only called here, inside the function body — never at
 * module top-level. `src/store/store.ts` -> `geminiApiSlice.ts` -> `geminiService.ts` ->
 * `lib/errors.ts` is a real import cycle, so this module and `store.ts` can end up in each
 * other's dependency graph. ES module bindings are live references resolved at access time,
 * so the `import` above is safe regardless; what would NOT be safe is reading `store`'s
 * value at this module's own top level (e.g. a top-level `const lang = store.getState()...`),
 * which could run before `store.ts` finishes initializing. Keep every read inside a function.
 */
export function getCurrentLang(): AppLanguage {
  return store.getState().settings.data.appLanguage;
}

/**
 * Hook-free translate function for plain modules that cannot call useTranslation()
 * (src/services/nonAi/*, src/lib/errors.ts, class components like ErrorBoundary). Reads
 * the language from the same Redux store useSettings()/useTranslation() read, so hook- and
 * non-hook-rendered text can never disagree.
 */
export function translateSync(
  key: TranslationKey | (string & {}),
  values?: Record<string, string | number>,
): string {
  return resolveTranslation(getCurrentLang(), key, values);
}
