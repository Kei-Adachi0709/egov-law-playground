import { create, type StoreApi } from 'zustand';
import { persist, type PersistOptions, type StateStorage } from 'zustand/middleware';

import type { SearchParams } from '../types/law';
import { createStorage } from './storage';

export interface SearchHistoryEntry {
  params: SearchParams;
  executedAt: string;
}

interface SearchStateData {
  history: SearchHistoryEntry[];
  lastParams: SearchParams | null;
  page: number;
  pageSize: number;
}

interface SearchActions {
  addHistory: (params: SearchParams) => void;
  clearHistory: () => void;
  setLastParams: (params: SearchParams | null) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  resetPagination: () => void;
}

export type SearchState = SearchStateData & SearchActions;

const SEARCH_STORE_VERSION = 1;
export const SEARCH_HISTORY_LIMIT = 30;
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

type SearchPersistedState = Pick<SearchState, 'history' | 'lastParams' | 'page' | 'pageSize'>;

const createInitialData = (): SearchPersistedState => ({
  history: [],
  lastParams: null,
  page: DEFAULT_PAGE,
  pageSize: DEFAULT_PAGE_SIZE
});

const dedupeHistory = (entries: SearchHistoryEntry[]): SearchHistoryEntry[] => {
  const unique = new Map<string, SearchHistoryEntry>();
  for (const entry of entries) {
    const key = JSON.stringify(entry.params ?? {});
    if (unique.has(key)) {
      unique.delete(key);
    }
    unique.set(key, entry);
  }
  return Array.from(unique.values());
};

const createPersistOptions = (
  storage?: StateStorage
): PersistOptions<SearchState, SearchPersistedState> => ({
  name: 'search-store',
  version: SEARCH_STORE_VERSION,
  storage: createStorage<SearchPersistedState>(storage),
  migrate: (persistedState: unknown) => {
    const base = createInitialData();
    if (!persistedState) {
      return base;
    }
    const incoming = persistedState as Partial<SearchPersistedState>;
    const history = incoming.history ? dedupeHistory(incoming.history) : base.history;
    return {
      history: history.slice(-SEARCH_HISTORY_LIMIT),
      lastParams: incoming.lastParams ?? base.lastParams,
      page: incoming.page ?? base.page,
      pageSize: incoming.pageSize ?? base.pageSize
    };
  },
  partialize: (state: SearchState) => ({
    history: state.history,
    lastParams: state.lastParams,
    page: state.page,
    pageSize: state.pageSize
  })
});

const clampPage = (page: number): number => {
  if (!Number.isFinite(page) || page < 1) {
    return DEFAULT_PAGE;
  }
  return Math.floor(page);
};

const clampPageSize = (size: number): number => {
  if (!Number.isFinite(size) || size < 1) {
    return DEFAULT_PAGE_SIZE;
  }
  return Math.min(Math.floor(size), 100);
};

const createHistoryEntry = (params: SearchParams): SearchHistoryEntry => ({
  params,
  executedAt: new Date().toISOString()
});

const creator = (
  set: StoreApi<SearchState>['setState']
): SearchState => ({
  ...createInitialData(),
  addHistory: (params: SearchParams) =>
    set((state: SearchState) => {
      const nextHistory = dedupeHistory([...state.history, createHistoryEntry(params)]);
      const trimmed = nextHistory.slice(-SEARCH_HISTORY_LIMIT);
      return { history: trimmed };
    }),
  clearHistory: () => set({ history: [] }),
  setLastParams: (params: SearchParams | null) =>
    set({ lastParams: params, page: DEFAULT_PAGE }),
  setPage: (page: number) => set({ page: clampPage(page) }),
  setPageSize: (pageSize: number) =>
    set({
      pageSize: clampPageSize(pageSize),
      page: DEFAULT_PAGE
    }),
  resetPagination: () => set({ page: DEFAULT_PAGE, pageSize: DEFAULT_PAGE_SIZE })
});

export const createSearchStore = (storage?: StateStorage): StoreApi<SearchState> =>
  create<SearchState>()(
    persist<SearchState>(creator, createPersistOptions(storage))
  );

export const useSearchStore = createSearchStore();
