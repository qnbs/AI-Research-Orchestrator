import 'fake-indexeddb/auto';
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
} from './apiKeyService';

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
});
