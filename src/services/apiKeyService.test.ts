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

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await saveApiKey(VALID_KEY);
      warnSpy.mockRestore();

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

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await saveApiKey(VALID_KEY);
      warnSpy.mockRestore();

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('does not notify when the vault already holds a hardened key', async () => {
      await saveApiKey(VALID_KEY);

      const listener = vi.fn();
      setVaultResetListener(listener);
      await saveApiKey(VALID_KEY);

      expect(listener).not.toHaveBeenCalled();
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
      generateKeySpy.mockRestore();

      await expect(getApiKey()).resolves.toBe(VALID_KEY);
      await expect(getNcbiApiKey()).resolves.toBe('ncbi-test-key');
    });

    it('converges concurrent callers on one key even when racing a pre-hardening vault reset', async () => {
      const db = await openVaultDatabase();
      await putVaultEntry(db, ENCRYPTION_KEY_NAME, new Uint8Array(32));
      db.close();

      const generateKeySpy = vi.spyOn(crypto.subtle, 'generateKey');
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await Promise.all([saveApiKey(VALID_KEY), saveNcbiApiKey('ncbi-test-key')]);
      warnSpy.mockRestore();
      expect(generateKeySpy).toHaveBeenCalledTimes(1);
      generateKeySpy.mockRestore();

      await expect(getApiKey()).resolves.toBe(VALID_KEY);
      await expect(getNcbiApiKey()).resolves.toBe('ncbi-test-key');

      const db2 = await openVaultDatabase();
      const stored = await getVaultEntry(db2, ENCRYPTION_KEY_NAME);
      db2.close();
      expect(stored).toBeInstanceOf(CryptoKey);
    });
  });
});
