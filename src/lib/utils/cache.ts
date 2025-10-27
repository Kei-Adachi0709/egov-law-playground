type CacheStrategy = 'session' | 'indexedDB' | 'memory';

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

interface CacheOptions {
  namespace?: string;
  ttlMs?: number;
  strategy?: CacheStrategy;
}

const MEMORY_CACHE = new Map<string, CacheEntry<unknown>>();
const DEFAULT_NAMESPACE = 'global';
const DEFAULT_TTL_MS = 1000 * 60 * 5;

const DB_NAME = 'hourei-cache';
const DB_VERSION = 1;
const STORE_NAME = 'cache';

let dbPromise: Promise<IDBDatabase> | undefined;

const isBrowser = typeof window !== 'undefined';
const globalObject = globalThis as typeof globalThis & {
  indexedDB?: IDBFactory;
};

const indexedDbFactory = globalObject.indexedDB;

const hasSessionStorage = (() => {
  if (!isBrowser) {
    return false;
  }
  try {
    const testKey = '__hourei_session_test__';
    window.sessionStorage.setItem(testKey, testKey);
    window.sessionStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
})();

const hasIndexedDb = Boolean(indexedDbFactory);

const buildKey = (namespace: string | undefined, rawKey: string): string =>
  `${namespace ?? DEFAULT_NAMESPACE}:${rawKey}`;

const resolveTtl = (ttlMs: number | undefined) => Math.max(ttlMs ?? DEFAULT_TTL_MS, 1000);

const normalizeEntry = <T>(entry: CacheEntry<T> | undefined): T | undefined => {
  if (!entry) {
    return undefined;
  }
  if (entry.expiresAt < Date.now()) {
    return undefined;
  }
  return entry.value;
};

const readFromSession = <T>(key: string): T | undefined => {
  if (!hasSessionStorage) {
    return undefined;
  }
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) {
      return undefined;
    }
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    const value = normalizeEntry(parsed);
    if (!value) {
      window.sessionStorage.removeItem(key);
    }
    return value;
  } catch (error) {
    console.warn('[Hourei] Failed to read session cache', error);
    return undefined;
  }
};

const writeToSession = <T>(key: string, entry: CacheEntry<T>) => {
  if (!hasSessionStorage) {
    return;
  }
  try {
    window.sessionStorage.setItem(key, JSON.stringify(entry));
  } catch (error) {
    console.warn('[Hourei] Failed to write session cache', error);
  }
};

const openDatabase = (): Promise<IDBDatabase> => {
  if (!hasIndexedDb || !indexedDbFactory) {
    return Promise.reject(new Error('IndexedDB is not available.'));
  }
  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDbFactory.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error ?? new Error('Failed to open cache database.'));
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };
    });
  }
  return dbPromise;
};

const readFromIndexedDb = async <T>(key: string): Promise<T | undefined> => {
  if (!hasIndexedDb) {
    return undefined;
  }
  try {
    const db = await openDatabase();
    const entry = await new Promise<CacheEntry<T> | undefined>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result as CacheEntry<T> | undefined);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB read failed.'));
    });
    const value = normalizeEntry(entry);
    if (!value) {
      await deleteFromIndexedDb(key);
    }
    return value;
  } catch (error) {
    console.warn('[Hourei] Failed to read IndexedDB cache', error);
    return undefined;
  }
};

const writeToIndexedDb = async <T>(key: string, entry: CacheEntry<T>) => {
  if (!hasIndexedDb) {
    return;
  }
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ key, ...entry });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error('IndexedDB write failed.'));
    });
  } catch (error) {
    console.warn('[Hourei] Failed to write IndexedDB cache', error);
  }
};

const deleteFromIndexedDb = async (key: string) => {
  if (!hasIndexedDb) {
    return;
  }
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error('IndexedDB delete failed.'));
    });
  } catch (error) {
    console.warn('[Hourei] Failed to delete IndexedDB cache', error);
  }
};

const readFromMemory = <T>(key: string): T | undefined => {
  const entry = MEMORY_CACHE.get(key) as CacheEntry<T> | undefined;
  const value = normalizeEntry(entry);
  if (!value) {
    MEMORY_CACHE.delete(key);
  }
  return value;
};

const writeToMemory = <T>(key: string, entry: CacheEntry<T>) => {
  MEMORY_CACHE.set(key, entry);
};

export const getCachedValue = async <T>(
  rawKey: string,
  options?: CacheOptions
): Promise<T | undefined> => {
  const key = buildKey(options?.namespace, rawKey);
  const strategy = options?.strategy ?? 'session';

  if (strategy === 'memory') {
    return readFromMemory<T>(key);
  }

  const sessionValue = strategy === 'session' ? readFromSession<T>(key) : undefined;
  if (sessionValue !== undefined) {
    return sessionValue;
  }

  if (strategy === 'indexedDB') {
    const dbValue = await readFromIndexedDb<T>(key);
    if (dbValue !== undefined) {
      return dbValue;
    }
  }

  return readFromMemory<T>(key);
};

export const setCachedValue = async <T>(rawKey: string, value: T, options?: CacheOptions) => {
  const key = buildKey(options?.namespace, rawKey);
  const ttlMs = resolveTtl(options?.ttlMs);
  const strategy = options?.strategy ?? 'session';
  const entry: CacheEntry<T> = {
    value,
    expiresAt: Date.now() + ttlMs
  };

  if (strategy === 'session') {
    writeToSession(key, entry);
  } else if (strategy === 'indexedDB') {
    await writeToIndexedDb(key, entry);
    writeToSession(key, entry);
  }

  writeToMemory(key, entry);
};

export const invalidateCacheKey = async (rawKey: string, options?: CacheOptions) => {
  const key = buildKey(options?.namespace, rawKey);
  MEMORY_CACHE.delete(key);
  if (hasSessionStorage) {
    try {
      window.sessionStorage.removeItem(key);
    } catch (error) {
      console.warn('[Hourei] Failed to remove session cache', error);
    }
  }
  if (options?.strategy === 'indexedDB') {
    await deleteFromIndexedDb(key);
  }
};

export type { CacheOptions, CacheStrategy };
