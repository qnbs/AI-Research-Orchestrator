/**
 * Secure API Key Service
 * Handles encryption, storage, and retrieval of the Gemini API key.
 * Uses Web Crypto API for AES-GCM encryption and IndexedDB for storage.
 */

const ENCRYPTION_KEY_NAME = 'ai-research-encryption-key';
const STORAGE_KEY = 'encrypted-api-key';

/**
 * Generates or retrieves the encryption key from IndexedDB.
 * The key is generated once and reused for all encryption/decryption operations.
 */
async function getOrCreateEncryptionKey(): Promise<CryptoKey> {
    const db = await openKeyDatabase();
    
    // Try to retrieve existing key
    const existingKeyData = await getFromKeyStore(db, ENCRYPTION_KEY_NAME);
    if (existingKeyData) {
        return crypto.subtle.importKey(
            'raw',
            existingKeyData.buffer as ArrayBuffer,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }
    
    // Generate new key
    const key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
    
    // Export and store
    const exportedKey = await crypto.subtle.exportKey('raw', key);
    await saveToKeyStore(db, ENCRYPTION_KEY_NAME, new Uint8Array(exportedKey));
    
    return key;
}

function openKeyDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('APIKeyVault', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains('keys')) {
                db.createObjectStore('keys');
            }
        };
    });
}

function getFromKeyStore(db: IDBDatabase, key: string): Promise<Uint8Array | null> {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('keys', 'readonly');
        const store = tx.objectStore('keys');
        const request = store.get(key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || null);
    });
}

function saveToKeyStore(db: IDBDatabase, key: string, value: Uint8Array): Promise<void> {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('keys', 'readwrite');
        const store = tx.objectStore('keys');
        const request = store.put(value, key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

function deleteFromKeyStore(db: IDBDatabase, key: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('keys', 'readwrite');
        const store = tx.objectStore('keys');
        const request = store.delete(key);
        request.onerror = () => reject(request.error);
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
    
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        data
    );
    
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
        encrypted.buffer as ArrayBuffer
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
}

/**
 * Saves the API key securely to IndexedDB.
 */
export async function saveApiKey(apiKey: string): Promise<void> {
    const { iv, encrypted } = await encryptApiKey(apiKey);
    const db = await openKeyDatabase();
    
    // Store IV and encrypted data together
    const combined = new Uint8Array(iv.length + encrypted.length);
    combined.set(iv, 0);
    combined.set(encrypted, iv.length);
    
    await saveToKeyStore(db, STORAGE_KEY, combined);
}

/**
 * Retrieves and decrypts the API key from IndexedDB.
 */
export async function getApiKey(): Promise<string | null> {
    try {
        const db = await openKeyDatabase();
        const combined = await getFromKeyStore(db, STORAGE_KEY);
        
        if (!combined) {
            return null;
        }
        
        const iv = combined.slice(0, 12);
        const encrypted = combined.slice(12);
        
        return await decryptApiKey(iv, encrypted);
    } catch (error) {
        console.error('Failed to retrieve API key:', error);
        return null;
    }
}

/**
 * Checks if an API key is stored.
 */
export async function hasApiKey(): Promise<boolean> {
    const key = await getApiKey();
    return key !== null && key.length > 0;
}

/**
 * Removes the stored API key.
 */
export async function removeApiKey(): Promise<void> {
    const db = await openKeyDatabase();
    await deleteFromKeyStore(db, STORAGE_KEY);
}

/**
 * Validates an API key format (basic check).
 */
export function validateApiKeyFormat(apiKey: string): boolean {
    // Gemini API keys typically start with 'AIza' and are 39 characters
    return /^AIza[a-zA-Z0-9_-]{35}$/.test(apiKey);
}
