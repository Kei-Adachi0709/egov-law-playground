import { describe, expect, it, vi } from 'vitest';
import type { StateStorage } from 'zustand/middleware';

import { SEARCH_HISTORY_LIMIT, createSearchStore } from '../src/store/searchStore';

type Memory = Map<string, string>;

const createMemoryStorage = (): StateStorage => {
  const store: Memory = new Map();
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

const createTestStore = () => {
  const store = createSearchStore(createMemoryStorage());
  const unsubscribe = store.subscribe(() => {});
  return { store, unsubscribe } as const;
};

describe('searchStore', () => {
  it('keeps only the latest limited history entries', () => {
    const { store, unsubscribe } = createTestStore();
    try {
    const { addHistory } = store.getState();

    for (let index = 0; index < SEARCH_HISTORY_LIMIT + 5; index += 1) {
      addHistory({ keyword: `keyword-${index}` });
    }

    expect(store.getState().history).toHaveLength(SEARCH_HISTORY_LIMIT);
    expect(store.getState().history.at(-1)?.params.keyword).toBe(
      `keyword-${SEARCH_HISTORY_LIMIT + 4}`
    );
    } finally {
      unsubscribe();
    }
  });

  it('deduplicates history and keeps the latest timestamp', () => {
    const { store, unsubscribe } = createTestStore();
    try {
    const { addHistory } = store.getState();

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    addHistory({ keyword: 'administration' });
    const firstTimestamp = store.getState().history[0]?.executedAt;
    vi.setSystemTime(new Date('2024-01-02T00:00:00Z'));
    addHistory({ keyword: 'administration' });
    vi.useRealTimers();

    const entries = store.getState().history;
    expect(entries).toHaveLength(1);
    expect(entries[0].params.keyword).toBe('administration');
    expect(entries[0].executedAt).not.toBe(firstTimestamp);
    } finally {
      unsubscribe();
    }
  });

  it('resets pagination when search params change', () => {
    const { store, unsubscribe } = createTestStore();
    try {
    const { setPage, setLastParams } = store.getState();

    setPage(5);
    expect(store.getState().page).toBe(5);

    setLastParams({ keyword: 'law' });
    expect(store.getState().page).toBe(1);
    expect(store.getState().lastParams?.keyword).toBe('law');
    } finally {
      unsubscribe();
    }
  });

  it('ensures page size stays in an acceptable range', () => {
    const { store, unsubscribe } = createTestStore();
    try {
    const { setPage, setPageSize } = store.getState();

    setPage(3);
    setPageSize(5);
    expect(store.getState().pageSize).toBe(5);
    expect(store.getState().page).toBe(1);

    setPageSize(0);
    expect(store.getState().pageSize).toBeGreaterThan(0);

    setPageSize(500);
    expect(store.getState().pageSize).toBeLessThanOrEqual(100);
    } finally {
      unsubscribe();
    }
  });
});
