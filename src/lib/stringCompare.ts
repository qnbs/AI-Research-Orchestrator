/** Locale-aware string compare for stable sorting (e.g. PMIDs, keys). */
export function compareEnLocale(left: string, right: string): number {
  return left.localeCompare(right, 'en');
}
