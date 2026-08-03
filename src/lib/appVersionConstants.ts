/**
 * Canonical schema/cache version constants (P1-6).
 * Bump DEXIE_SCHEMA_VERSION when databaseService.ts adds a Dexie version.
 * Bump SW_CACHE_VERSION in public/sw.js when runtime cache strategy changes.
 */

/** Latest Dexie schema version declared in databaseService.ts. */
export const DEXIE_SCHEMA_VERSION = 7;

/** Runtime cache suffix in public/sw.js CACHE_VERSION — keep in sync manually. */
export const SW_CACHE_VERSION = 'v1';
