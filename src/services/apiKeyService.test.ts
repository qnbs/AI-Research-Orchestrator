import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  validateApiKeyFormat,
  saveApiKey,
  getApiKey,
  hasApiKey,
  removeApiKey,
  saveNcbiApiKey,
  getNcbiApiKey,
  hasNcbiApiKey,
  removeNcbiApiKey,
  setVaultResetListener,
  toRejectionError,
  __resetEncryptionKeyCacheForTests,
} from './apiKeyService';

const ENCRYPTION_KEY_NAME = 'ai-research-encryption-key';

function openVaultDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('APIKeyVault', 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
  });
}

function getVaultEntry(db: IDBDatabase, key: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('keys', 'readonly');
    const req = tx.objectStore('keys').get(key);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
  });
}

function putVaultEntry(db: IDBDatabase, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('keys', 'readwrite');
    tx.objectStore('keys').put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

const VALID_KEY = `AIza${'1234567890123456789012345678901234a'}`; // test fixture — not a real secret

describe('apiKeyService', () => {
  const originalCrypto = globalThis.crypto;

  beforeEach(async () => {
    const { webcrypto } = await import('node:crypto');
    Object.defineProperty(globalThis, 'crypto', {
      value: webcrypto,
      configurable: true,
      writable: true,
    });
    __resetEncryptionKeyCacheForTests();
    setVaultResetListener(null);
    try {
      await removeApiKey();
      await removeNcbiApiKey();
    } catch {
      // vault may not exist yet
    }
  });

  afterEach(async () => {
    // Guarantees spy cleanup even if a test's own await/assertion throws
    // before reaching an explicit .mockRestore() call.
    vi.restoreAllMocks();
    try {
      await removeApiKey();
      await removeNcbiApiKey();
    } catch {
      // ignore
    }
    Object.defineProperty(globalThis, 'crypto', {
      value: originalCrypto,
      configurable: true,
      writable: true,
    });
  });

  describe('validateApiKeyFormat', () => {
    it('should accept valid Gemini API key format (39 chars)', () => {
      expect(validateApiKeyFormat(VALID_KEY)).toBe(true);
    });

    it('should accept keys with underscores and hyphens', () => {
      expect(validateApiKeyFormat('AIza_SyC-123456789012345678901234567890')).toBe(true);
    });

    it('should reject empty strings', () => {
      expect(validateApiKeyFormat('')).toBe(false);
    });

    it('should reject whitespace-only strings', () => {
      expect(validateApiKeyFormat('   ')).toBe(false);
    });

    it('should reject keys shorter than 39 characters', () => {
      expect(validateApiKeyFormat('AIzashort')).toBe(false);
    });

    it('should reject keys without AIza prefix', () => {
      expect(validateApiKeyFormat('XYZaSyC1234567890abcdefghijklmnopqrs')).toBe(false);
    });

    it('should reject keys longer than 39 characters', () => {
      expect(validateApiKeyFormat('AIzaSyC1234567890abcdefghijklmnopqrstuvwxyz')).toBe(false);
    });

    it('should reject keys with invalid characters', () => {
      expect(validateApiKeyFormat('AIzaSyC123456789!@#$%^&*()abcdefghij')).toBe(false);
    });
  });

  describe('encrypted storage round-trip', () => {
    it('saveApiKey / getApiKey round-trips', async () => {
      await saveApiKey(VALID_KEY);
      await expect(getApiKey()).resolves.toBe(VALID_KEY);
      await expect(hasApiKey()).resolves.toBe(true);
    });

    it('getApiKey returns null when nothing stored', async () => {
      // Prefer removeApiKey: open IDB connections can block deleteDatabase.
      await removeApiKey();
      await expect(getApiKey()).resolves.toBeNull();
      await expect(hasApiKey()).resolves.toBe(false);
    });

    it('removeApiKey clears stored key', async () => {
      await saveApiKey(VALID_KEY);
      await removeApiKey();
      await expect(getApiKey()).resolves.toBeNull();
      await expect(hasApiKey()).resolves.toBe(false);
    });

    it('reuses encryption key across operations', async () => {
      await saveApiKey(VALID_KEY);
      const first = await getApiKey();
      await saveApiKey(VALID_KEY);
      const second = await getApiKey();
      expect(first).toBe(VALID_KEY);
      expect(second).toBe(VALID_KEY);
    });

    it('getApiKey returns null when decrypt fails', async () => {
      await saveApiKey(VALID_KEY);
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open('APIKeyVault', 1);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => resolve(req.result);
      });
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('keys', 'readwrite');
        // Corrupt the per-provider slot so decryption fails.
        tx.objectStore('keys').put(new Uint8Array([1, 2, 3, 4]), 'encrypted-api-key-gemini');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();

      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await expect(getApiKey()).resolves.toBeNull();
      spy.mockRestore();
    });

    it('saveNcbiApiKey / getNcbiApiKey round-trips trimmed keys', async () => {
      await saveNcbiApiKey('  ncbi-test-key  ');
      await expect(getNcbiApiKey()).resolves.toBe('ncbi-test-key');
      await expect(hasNcbiApiKey()).resolves.toBe(true);
    });

    it('removeNcbiApiKey clears stored NCBI key', async () => {
      await saveNcbiApiKey('ncbi-test-key');
      await removeNcbiApiKey();
      await expect(getNcbiApiKey()).resolves.toBeNull();
      await expect(hasNcbiApiKey()).resolves.toBe(false);
    });

    it('saveNcbiApiKey removes the stored key when saving an empty string', async () => {
      await saveNcbiApiKey('ncbi-test-key');
      await saveNcbiApiKey('   ');
      await expect(getNcbiApiKey()).resolves.toBeNull();
      await expect(hasNcbiApiKey()).resolves.toBe(false);
    });
  });

  describe('master key hardening (non-extractable CryptoKey)', () => {
    it('persists the master key as a non-extractable CryptoKey', async () => {
      await saveApiKey(VALID_KEY);
      const db = await openVaultDatabase();
      const stored = await getVaultEntry(db, ENCRYPTION_KEY_NAME);
      db.close();
      expect(stored).toBeInstanceOf(CryptoKey);
      expect((stored as CryptoKey).extractable).toBe(false);
    });

    it('rejects exporting the stored master key', async () => {
      await saveApiKey(VALID_KEY);
      const db = await openVaultDatabase();
      const stored = await getVaultEntry(db, ENCRYPTION_KEY_NAME);
      db.close();
      await expect(crypto.subtle.exportKey('raw', stored as CryptoKey)).rejects.toThrow();
    });

    it('never calls crypto.subtle.exportKey anywhere in the source file', () => {
      const source = readFileSync(join(process.cwd(), 'src/services/apiKeyService.ts'), 'utf-8');
      expect(source).not.toMatch(/exportKey/);
    });

    it('resets the vault and generates a fresh non-extractable key if a pre-hardening raw key is found', async () => {
      const db = await openVaultDatabase();
      // Simulate a pre-hardening vault: the master key stored as raw exported bytes.
      await putVaultEntry(db, ENCRYPTION_KEY_NAME, new Uint8Array(32));
      db.close();

      vi.spyOn(console, 'warn').mockImplementation(() => {});
      await saveApiKey(VALID_KEY);

      await expect(getApiKey()).resolves.toBe(VALID_KEY);

      const db2 = await openVaultDatabase();
      const stored = await getVaultEntry(db2, ENCRYPTION_KEY_NAME);
      db2.close();
      expect(stored).toBeInstanceOf(CryptoKey);
      expect((stored as CryptoKey).extractable).toBe(false);
    });

    it('notifies the registered listener when a pre-hardening vault is reset', async () => {
      const db = await openVaultDatabase();
      await putVaultEntry(db, ENCRYPTION_KEY_NAME, new Uint8Array(32));
      db.close();

      const listener = vi.fn();
      setVaultResetListener(listener);

      vi.spyOn(console, 'warn').mockImplementation(() => {});
      await saveApiKey(VALID_KEY);

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('does not notify when the vault already holds a hardened key', async () => {
      await saveApiKey(VALID_KEY);

      const listener = vi.fn();
      setVaultResetListener(listener);
      await saveApiKey(VALID_KEY);

      expect(listener).not.toHaveBeenCalled();
    });

    it('buffers a reset that happens before any listener is registered, delivering it once one is', async () => {
      // Mirrors the real app: a descendant effect (Header -> InferenceModeBadge
      // -> useInferenceMode) can reach getOrCreateEncryptionKey before
      // App.tsx's own effect has called setVaultResetListener, since React
      // fires child effects before parent effects on mount.
      const db = await openVaultDatabase();
      await putVaultEntry(db, ENCRYPTION_KEY_NAME, new Uint8Array(32));
      db.close();

      vi.spyOn(console, 'warn').mockImplementation(() => {});
      await saveApiKey(VALID_KEY); // no listener registered yet - reset fires without one

      const listener = vi.fn();
      setVaultResetListener(listener); // registered afterward, as App.tsx's effect would

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('converges concurrent callers on one master key instead of racing to different ones', async () => {
      // Concurrent Promise.all-style calls (mirroring ApiKeySettings.tsx's
      // mount-time Promise.all([hasProviderApiKey(...), getNcbiApiKey()]))
      // must not each independently regenerate the master key. Start from a
      // vault with no master key yet so generateKey is guaranteed to fire.
      const db = await openVaultDatabase();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('keys', 'readwrite');
        tx.objectStore('keys').delete(ENCRYPTION_KEY_NAME);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();

      const generateKeySpy = vi.spyOn(crypto.subtle, 'generateKey');
      await Promise.all([saveApiKey(VALID_KEY), saveNcbiApiKey('ncbi-test-key')]);
      expect(generateKeySpy).toHaveBeenCalledTimes(1);

      await expect(getApiKey()).resolves.toBe(VALID_KEY);
      await expect(getNcbiApiKey()).resolves.toBe('ncbi-test-key');
    });

    it('converges concurrent callers on one key even when racing a pre-hardening vault reset', async () => {
      const db = await openVaultDatabase();
      await putVaultEntry(db, ENCRYPTION_KEY_NAME, new Uint8Array(32));
      db.close();

      const generateKeySpy = vi.spyOn(crypto.subtle, 'generateKey');
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      await Promise.all([saveApiKey(VALID_KEY), saveNcbiApiKey('ncbi-test-key')]);
      expect(generateKeySpy).toHaveBeenCalledTimes(1);

      await expect(getApiKey()).resolves.toBe(VALID_KEY);
      await expect(getNcbiApiKey()).resolves.toBe('ncbi-test-key');

      const db2 = await openVaultDatabase();
      const stored = await getVaultEntry(db2, ENCRYPTION_KEY_NAME);
      db2.close();
      expect(stored).toBeInstanceOf(CryptoKey);
    });
  });

  describe('toRejectionError', () => {
    it('returns a real Error unchanged', () => {
      const original = new Error('boom');
      expect(toRejectionError(original as unknown as DOMException)).toBe(original);
    });

    it('preserves name and message from a non-Error DOMException-shaped value', () => {
      // A plain object is never instanceof Error in any host, unlike
      // `new DOMException(...)` (instanceof Error in plain Node, but not in
      // this project's actual jsdom+fake-indexeddb test environment - see
      // the real-fake-indexeddb-error test below, which isn't host-dependent
      // either way since it exercises the genuine error path directly).
      const domExceptionLike = {
        name: 'QuotaExceededError',
        message: 'Quota exceeded',
      } as DOMException;
      expect(domExceptionLike).not.toBeInstanceOf(Error);

      const wrapped = toRejectionError(domExceptionLike);
      expect(wrapped).toBeInstanceOf(Error);
      expect(wrapped.name).toBe('QuotaExceededError');
      expect(wrapped.message).toBe('Quota exceeded');
    });

    it('preserves name and message from a real fake-indexeddb error', async () => {
      const dbName = '___toRejectionError_probe___';
      const opened = indexedDB.open(dbName, 2);
      await new Promise<void>((resolve, reject) => {
        opened.onsuccess = () => resolve();
        opened.onerror = () => reject(opened.error);
      });
      opened.result.close();

      // Re-opening with a lower version triggers a genuine VersionError.
      const reopened = indexedDB.open(dbName, 1);
      const realError = await new Promise<DOMException | null>((resolve) => {
        reopened.onerror = () => resolve(reopened.error);
        reopened.onsuccess = () => resolve(null);
      });
      expect(realError).not.toBeNull();
      expect(realError).not.toBeInstanceOf(Error);

      const wrapped = toRejectionError(realError);
      expect(wrapped).toBeInstanceOf(Error);
      expect(wrapped.name).toBe('VersionError');
      expect(wrapped.message).toContain('lower version');
    });

    it('falls back to a generic message when error is null', () => {
      const wrapped = toRejectionError(null);
      expect(wrapped.message).toBe('IndexedDB request failed');
    });
  });
});
