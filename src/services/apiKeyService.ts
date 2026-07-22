/**
 * Secure API Key Service
 * Handles encryption, storage, and retrieval of API keys.
 * Uses Web Crypto API for AES-GCM encryption and IndexedDB for storage.
 */

import type { AIProviderId } from './providers/types';
import { toAppError } from '../lib/errors';
import { getProviderMeta } from './providers/provider';

const ENCRYPTION_KEY_NAME = 'ai-research-encryption-key';
const LEGACY_GEMINI_STORAGE_KEY = 'encrypted-api-key';
const STORAGE_KEY_NCBI = 'encrypted-ncbi-api-key';

const PROVIDER_STORAGE_KEYS: Record<AIProviderId, string> = {
  gemini: 'encrypted-api-key-gemini',
  openai: 'encrypted-api-key-openai',
  anthropic: 'encrypted-api-key-anthropic',
  ollama: 'encrypted-api-key-ollama',
  heuristic: 'encrypted-api-key-heuristic',
};

// Memoizes the single in-flight/resolved key so concurrent callers (e.g.
// ApiKeySettings.tsx's Promise.all([hasProviderApiKey(...), getNcbiApiKey()])
// on mount) converge on the same key instead of each independently reading
// IndexedDB, each detecting a legacy vault, and each generating and saving a
// different replacement key - the last write wins and silently orphans
// whatever was just encrypted with the key that lost the race.
let encryptionKeyPromise: Promise<CryptoKey> | null = null;

/** Test-only: clears the in-memory cache so the next call re-reads IndexedDB. */
export function __resetEncryptionKeyCacheForTests(): void {
  encryptionKeyPromise = null;
}

// This service has no dependency on the Redux store or React - it's called
// from provider adapters and Settings alike, with no single call site that
// naturally has `dispatch` on hand. A pre-hardening vault reset is notified
// via this registered callback (set once at app bootstrap, where dispatch/t
// are already available) instead of importing the store singleton directly,
// which would close an import cycle back through geminiService.ts (which
// imports this file for getNcbiApiKey) to store.ts.
let vaultResetListener: (() => void) | null = null;

/** Registers a callback invoked when a pre-hardening vault is reset. Pass null to unregister. */
export function setVaultResetListener(listener: (() => void) | null): void {
  vaultResetListener = listener;
}

/**
 * Generates or retrieves the encryption key from IndexedDB.
 * The key is generated once and reused for all encryption/decryption operations.
 *
 * The key is non-extractable: it is generated with `extractable: false` and the
 * `CryptoKey` object itself (never its raw bytes) is persisted via IndexedDB's
 * structured-clone support. Raw key material is never readable by JavaScript,
 * including this app's own — only `crypto.subtle` can use it, so an XSS payload
 * or a compromised third-party script can no longer read the master key that
 * protects every stored provider secret.
 */
async function getOrCreateEncryptionKey(): Promise<CryptoKey> {
  encryptionKeyPromise ??= resolveEncryptionKey().catch((error: unknown) => {
    encryptionKeyPromise = null;
    throw error;
  });
  return encryptionKeyPromise;
}

async function resolveEncryptionKey(): Promise<CryptoKey> {
  const db = await openKeyDatabase();

  const existingKeyData = await getFromKeyStore<CryptoKey | Uint8Array>(db, ENCRYPTION_KEY_NAME);
  if (existingKeyData) {
    if (existingKeyData instanceof CryptoKey) {
      return existingKeyData;
    }
    // Pre-hardening vault format (raw exported key bytes from an older build).
    // This app has no production users yet, so there is nothing to migrate:
    // reset the whole vault and let the user re-enter their provider keys,
    // rather than attempt to recover or convert the old format.
    console.warn(
      'API key vault used an outdated, extractable key format; resetting the local vault.',
    );
    await clearKeyStore(db);
    vaultResetListener?.();
  }

  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ]);
  await saveToKeyStore(db, ENCRYPTION_KEY_NAME, key);
  return key;
}

export function toRejectionError(error: DOMException | null): Error {
  if (error instanceof Error) return error;
  // Some environments' DOMException (e.g. fake-indexeddb in tests) is not
  // instanceof Error, unlike Node's/browsers' native DOMException. Preserve
  // .name/.message rather than flattening to a generic message: isAbortError()
  // in lib/errors.ts and toAppError()'s message-based classification both
  // depend on the real name/message surviving this rejection.
  //
  // The cast below works around a real tsc quirk: since lib.dom.d.ts declares
  // DOMException extends Error, this branch narrows to exactly `null`, and
  // `null?.message` then fails to typecheck (NonNullable<null> is `never`,
  // even though the expression is only ever evaluated on an actual object at
  // runtime - `error` was never reassigned, only its static type changed).
  const domError = error as DOMException | null;
  const wrapped = new Error(domError?.message ?? 'IndexedDB request failed');
  if (domError?.name) wrapped.name = domError.name;
  return wrapped;
}

function openKeyDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('APIKeyVault', 1);
    request.onerror = () => reject(toRejectionError(request.error));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('keys')) {
        db.createObjectStore('keys');
      }
    };
  });
}

function getFromKeyStore<T = Uint8Array>(db: IDBDatabase, key: string): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('keys', 'readonly');
    const store = tx.objectStore('keys');
    const request = store.get(key);
    request.onerror = () => reject(toRejectionError(request.error));
    request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
  });
}

function saveToKeyStore<T>(db: IDBDatabase, key: string, value: T): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('keys', 'readwrite');
    const store = tx.objectStore('keys');
    const request = store.put(value, key);
    request.onerror = () => reject(toRejectionError(request.error));
    request.onsuccess = () => resolve();
  });
}

function deleteFromKeyStore(db: IDBDatabase, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('keys', 'readwrite');
    const store = tx.objectStore('keys');
    const request = store.delete(key);
    request.onerror = () => reject(toRejectionError(request.error));
    request.onsuccess = () => resolve();
  });
}

function clearKeyStore(db: IDBDatabase): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('keys', 'readwrite');
    const store = tx.objectStore('keys');
    const request = store.clear();
    request.onerror = () => reject(toRejectionError(request.error));
    request.onsuccess = () => resolve();
  });
}

/**
 * Encrypts the API key using AES-GCM.
 */
async function encryptApiKey(apiKey: string): Promise<{ iv: Uint8Array; encrypted: Uint8Array }> {
  const key = await getOrCreateEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);

  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);

  return { iv, encrypted: new Uint8Array(encrypted) };
}

/**
 * Decrypts the API key using AES-GCM.
 */
async function decryptApiKey(iv: Uint8Array, encrypted: Uint8Array): Promise<string> {
  const key = await getOrCreateEncryptionKey();

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    encrypted.buffer as ArrayBuffer,
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Saves a secret securely to IndexedDB.
 */
async function saveEncryptedSecret(storageKey: string, value: string): Promise<void> {
  const { iv, encrypted } = await encryptApiKey(value);
  const db = await openKeyDatabase();

  // Store IV and encrypted data together
  const combined = new Uint8Array(iv.length + encrypted.length);
  combined.set(iv, 0);
  combined.set(encrypted, iv.length);

  await saveToKeyStore(db, storageKey, combined);
}

/**
 * Retrieves and decrypts a secret from IndexedDB.
 * Throws AppError on failure for proper error propagation.
 */
async function getEncryptedSecret(
  storageKey: string,
  label: string,
  throwOnError: boolean = false,
): Promise<string | null> {
  try {
    const db = await openKeyDatabase();
    const combined = await getFromKeyStore(db, storageKey);

    if (!combined) {
      return null;
    }

    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    return await decryptApiKey(iv, encrypted);
  } catch (error) {
    if (throwOnError) {
      throw toAppError(error, 'storage');
    }
    console.error(`Failed to retrieve ${label}:`, error);
    return null;
  }
}

/** Saves a provider API key securely to IndexedDB. */
export async function saveProviderApiKey(provider: AIProviderId, apiKey: string): Promise<void> {
  await saveEncryptedSecret(PROVIDER_STORAGE_KEYS[provider], apiKey);
}

/**
 * Retrieves and decrypts a provider API key from IndexedDB.
 * For Gemini, lazily migrates a key stored under the legacy slot.
 */
export async function getProviderApiKey(provider: AIProviderId): Promise<string | null> {
  const value = await getEncryptedSecret(PROVIDER_STORAGE_KEYS[provider], `${provider} API key`);
  if (value || provider !== 'gemini') return value;

  // Lazy migration from the legacy single-key storage.
  const legacy = await getEncryptedSecret(LEGACY_GEMINI_STORAGE_KEY, 'API key');
  if (legacy) {
    try {
      await saveProviderApiKey('gemini', legacy);
      const db = await openKeyDatabase();
      await deleteFromKeyStore(db, LEGACY_GEMINI_STORAGE_KEY);
    } catch (error) {
      throw toAppError(error, 'storage');
    }
  }
  return legacy;
}

/** Checks whether a provider API key is stored. */
export async function hasProviderApiKey(provider: AIProviderId): Promise<boolean> {
  // Providers that don't require API keys (ollama, heuristic) always return true.
  const meta = getProviderMeta(provider);
  if (!meta.capabilities.requiresApiKey) {
    return true;
  }
  const key = await getProviderApiKey(provider);
  return key !== null && key.length > 0;
}

/** Removes a stored provider API key. */
export async function removeProviderApiKey(provider: AIProviderId): Promise<void> {
  const db = await openKeyDatabase();
  await deleteFromKeyStore(db, PROVIDER_STORAGE_KEYS[provider]);
}

/**
 * Legacy Gemini API key helpers (backward-compatible wrappers around the
 * per-provider vault). New code should prefer `getProviderApiKey('gemini')`.
 */
export async function saveApiKey(apiKey: string): Promise<void> {
  await saveProviderApiKey('gemini', apiKey);
}

export async function getApiKey(): Promise<string | null> {
  return getProviderApiKey('gemini');
}

export async function hasApiKey(): Promise<boolean> {
  return hasProviderApiKey('gemini');
}

export async function removeApiKey(): Promise<void> {
  await removeProviderApiKey('gemini');
}

/**
 * Saves the NCBI API key securely to IndexedDB.
 * NCBI keys have variable formats, so only trimming is applied.
 */
export async function saveNcbiApiKey(apiKey: string): Promise<void> {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    await removeNcbiApiKey();
    return;
  }
  await saveEncryptedSecret(STORAGE_KEY_NCBI, trimmed);
}

/**
 * Retrieves and decrypts the NCBI API key from IndexedDB.
 */
export async function getNcbiApiKey(): Promise<string | null> {
  return getEncryptedSecret(STORAGE_KEY_NCBI, 'NCBI API key');
}

/**
 * Checks if an NCBI API key is stored.
 */
export async function hasNcbiApiKey(): Promise<boolean> {
  const key = await getNcbiApiKey();
  return key !== null && key.length > 0;
}

/**
 * Removes the stored NCBI API key.
 */
export async function removeNcbiApiKey(): Promise<void> {
  const db = await openKeyDatabase();
  await deleteFromKeyStore(db, STORAGE_KEY_NCBI);
}

/**
 * Validates an API key format.
 * `provider` defaults to 'gemini' for backward compatibility.
 */
export function validateApiKeyFormat(apiKey: string, provider: AIProviderId = 'gemini'): boolean {
  switch (provider) {
    case 'gemini':
      // Gemini API keys typically start with 'AIza' and are 39 characters
      return /^AIza[a-zA-Z0-9_-]{35}$/.test(apiKey);
    case 'openai':
      return /^sk-[a-zA-Z0-9_-]{20,}$/.test(apiKey);
    case 'anthropic':
      return /^sk-ant-[a-zA-Z0-9_-]{20,}$/.test(apiKey);
    case 'ollama':
      return true;
    default:
      return false;
  }
}
