/** Locale-aware string compare for stable sorting (e.g. PMIDs, keys). */
export const compareEnLocale = (left: string, right: string): number =>
  left.localeCompare(right, 'en');
