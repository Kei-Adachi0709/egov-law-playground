interface PersistResult<T> {
  value: T | undefined;
  stored: boolean;
}

const memoryStore = new Map<string, string>();

const tryGetStorage = (): Storage | undefined => {
  if (typeof window === 'undefined') {
    return undefined;
  }

  try {
    const { localStorage } = window;
    const probeKey = '__egov_persist_probe__';
    localStorage.setItem(probeKey, '1');
    localStorage.removeItem(probeKey);
    return localStorage;
  } catch {
    return undefined;
  }
};

const writeToStorage = (key: string, payload: string): boolean => {
  const storage = tryGetStorage();
  if (!storage) {
    return false;
  }

  try {
    storage.setItem(key, payload);
    return true;
  } catch {
    return false;
  }
};

const readFromStorage = (key: string): PersistResult<string> => {
  const storage = tryGetStorage();
  if (!storage) {
    return { value: undefined, stored: false };
  }

  try {
    const value = storage.getItem(key) ?? undefined;
    return { value, stored: true };
  } catch {
    return { value: undefined, stored: false };
  }
};

const removeFromStorage = (key: string): boolean => {
  const storage = tryGetStorage();
  if (!storage) {
    return false;
  }

  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};

const clearStorage = (): boolean => {
  const storage = tryGetStorage();
  if (!storage) {
    return false;
  }

  try {
    storage.clear();
    return true;
  } catch {
    return false;
  }
};

const readMemory = (key: string): string | undefined => memoryStore.get(key);
const writeMemory = (key: string, payload: string): void => {
  memoryStore.set(key, payload);
};
const removeMemory = (key: string): void => {
  memoryStore.delete(key);
};
const clearMemory = (): void => {
  memoryStore.clear();
};

const serialize = <T>(value: T): string => {
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value);
};

const deserialize = <T>(value: string | undefined, defaultValue?: T): T | undefined => {
  if (value === undefined) {
    return defaultValue;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return (value as unknown) as T;
  }
};

export interface PersistOptions<T> {
  defaultValue?: T;
}

export const persist = {
  isAvailable: (): boolean => tryGetStorage() !== undefined,
  get<T>(key: string, options: PersistOptions<T> = {}): T | undefined {
    const { value, stored } = readFromStorage(key);
    if (stored && value !== undefined) {
      return deserialize<T>(value, options.defaultValue);
    }

    const fallback = readMemory(key);
    if (fallback !== undefined) {
      return deserialize<T>(fallback, options.defaultValue);
    }

    return options.defaultValue;
  },
  set<T>(key: string, value: T): void {
    const payload = serialize(value);
    const stored = writeToStorage(key, payload);
    if (!stored) {
      writeMemory(key, payload);
    }
  },
  remove(key: string): void {
    const removed = removeFromStorage(key);
    if (!removed) {
      removeMemory(key);
    }
  },
  clear(): void {
    const cleared = clearStorage();
    if (!cleared) {
      clearMemory();
    } else {
      clearMemory();
    }
  },
  keys(): string[] {
    const storage = tryGetStorage();
    const keys = storage ? Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter((key): key is string => Boolean(key)) : [];
    memoryStore.forEach((_value, key) => {
      if (!keys.includes(key)) {
        keys.push(key);
      }
    });
    return keys;
  }
};
