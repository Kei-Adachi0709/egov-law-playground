import { create, type StoreApi } from 'zustand';
import { persist, type PersistOptions, type StateStorage } from 'zustand/middleware';

import { createStorage } from './storage';

export interface GachaSettings {
  categories: string[];
  keyword: string;
  historyLimit: number;
}

export interface GachaHistoryEntry {
  id: string;
  title: string;
  category?: string;
  keyword?: string;
  timestamp: string;
}

interface GachaStateData {
  history: GachaHistoryEntry[];
  settings: GachaSettings;
  favorites: Record<string, GachaHistoryEntry>;
}

interface GachaActions {
  setCategories: (categories: string[]) => void;
  setKeyword: (keyword: string) => void;
  setHistoryLimit: (limit: number) => void;
  addHistory: (entry: GachaHistoryEntry) => void;
  clearHistory: () => void;
  toggleFavorite: (entry: GachaHistoryEntry) => void;
  removeFavorite: (id: string) => void;
  clearFavorites: () => void;
  generateShareText: () => string;
}

export type GachaState = GachaStateData & GachaActions;

const GACHA_STORE_VERSION = 1;
const DEFAULT_HISTORY_LIMIT = 20;

export const GACHA_HISTORY_LIMIT = DEFAULT_HISTORY_LIMIT;

type GachaPersistedState = Pick<GachaState, 'history' | 'settings' | 'favorites'>;

const createInitialData = (): GachaPersistedState => ({
  history: [],
  settings: {
    categories: [],
    keyword: '',
    historyLimit: DEFAULT_HISTORY_LIMIT
  },
  favorites: {}
});

const normaliseCategories = (categories: string[]): string[] => {
  const seen = new Set<string>();
  return categories
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && !seen.has(item) && (seen.add(item), true));
};

const clampLimit = (limit: number): number => {
  if (!Number.isFinite(limit) || limit < 1) {
    return DEFAULT_HISTORY_LIMIT;
  }
  return Math.floor(limit);
};

const createPersistOptions = (
  storage?: StateStorage
): PersistOptions<GachaState, GachaPersistedState> => ({
  name: 'gacha-store',
  version: GACHA_STORE_VERSION,
  storage: createStorage(storage),
  migrate: (persistedState: unknown) => {
    const base = createInitialData();
    if (!persistedState) {
      return base;
    }
    const incoming = persistedState as Partial<GachaPersistedState>;
    return {
      history: incoming.history ?? base.history,
      settings: {
        ...base.settings,
        ...(incoming.settings ?? {})
      },
      favorites: incoming.favorites ?? base.favorites
    };
  },
  partialize: (state: GachaState) => ({
    history: state.history,
    settings: state.settings,
    favorites: state.favorites
  })
});

const creator = (
  set: StoreApi<GachaState>['setState'],
  get: StoreApi<GachaState>['getState']
): GachaState => ({
  ...createInitialData(),
  setCategories: (categories: string[]) =>
    set((state: GachaState) => ({
      settings: {
        ...state.settings,
        categories: normaliseCategories(categories)
      }
    })),
  setKeyword: (keyword: string) =>
    set((state: GachaState) => ({
      settings: {
        ...state.settings,
        keyword: keyword.trim()
      }
    })),
  setHistoryLimit: (limit: number) =>
    set((state: GachaState) => {
      const nextLimit = clampLimit(limit);
      const trimmedHistory = state.history.slice(-nextLimit);
      return {
        history: trimmedHistory,
        settings: {
          ...state.settings,
          historyLimit: nextLimit
        }
      };
    }),
  addHistory: (entry: GachaHistoryEntry) =>
    set((state: GachaState) => {
      const limit = Math.max(1, state.settings.historyLimit);
      const history = [...state.history, entry].slice(-limit);
      return { history };
    }),
  clearHistory: () => set({ history: [] }),
  toggleFavorite: (entry: GachaHistoryEntry) =>
    set((state: GachaState) => {
      const favorites = { ...state.favorites };
      if (favorites[entry.id]) {
        delete favorites[entry.id];
      } else {
        favorites[entry.id] = entry;
      }
      return { favorites };
    }),
  removeFavorite: (id: string) =>
    set((state: GachaState) => {
      if (!state.favorites[id]) {
        return state;
      }
      const favorites = { ...state.favorites };
      delete favorites[id];
      return { favorites };
    }),
  clearFavorites: () => set({ favorites: {} }),
  generateShareText: () => {
    const state = get();
    const latest = state.history.at(-1);
    const categories = state.settings.categories.join(', ') || 'unset';
    const keyword = state.settings.keyword || 'unset';
    const title = latest?.title ?? 'no result';
    return `Latest result: ${title} | Categories: ${categories} | Keyword: ${keyword}`;
  }
});

export const createGachaStore = (storage?: StateStorage): StoreApi<GachaState> =>
  create<GachaState>()(
    persist<GachaState>(creator, createPersistOptions(storage))
  );

export const useGachaStore = createGachaStore();
