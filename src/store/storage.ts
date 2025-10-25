import { createJSONStorage, type StateStorage } from 'zustand/middleware';

const createFallbackStorage = (): StateStorage => {
  const store = new Map<string, string>();
  return {
    getItem: (name: string) => store.get(name) ?? null,
    setItem: (name: string, value: string) => {
      store.set(name, value);
    },
    removeItem: (name: string) => {
      store.delete(name);
    }
  };
};

export const getClientStorage = (): StateStorage => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return createFallbackStorage();
};

export const createStorage = <T>(storage?: StateStorage) =>
  createJSONStorage<T>(() => storage ?? getClientStorage());
