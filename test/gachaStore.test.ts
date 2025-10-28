import { describe, expect, it } from 'vitest';
import type { StateStorage } from 'zustand/middleware';

import { createGachaStore } from '../src/store/gachaStore';

const createMemoryStorage = (): StateStorage => {
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

const createTestStore = () => {
  const store = createGachaStore(createMemoryStorage());
  const unsubscribe = store.subscribe(() => {});
  return { store, unsubscribe } as const;
};

describe('gachaStore', () => {
  it('respects history limit when adding entries', () => {
    const { store, unsubscribe } = createTestStore();
    try {
    const { setHistoryLimit, addHistory } = store.getState();

    setHistoryLimit(3);

    for (let index = 0; index < 5; index += 1) {
      addHistory({
        id: `law-${index}`,
        title: `Law ${index}`,
        timestamp: new Date(index).toISOString()
      });
    }

    const { history } = store.getState();
    expect(history).toHaveLength(3);
    expect(history[0].id).toBe('law-2');
    expect(history[2].id).toBe('law-4');
    } finally {
      unsubscribe();
    }
  });

  it('toggles favorites based on entry id', () => {
    const { store, unsubscribe } = createTestStore();
    try {
    const { toggleFavorite } = store.getState();
    const entry = {
      id: 'law-1',
      title: 'Sample Law',
      timestamp: new Date().toISOString()
    };

    toggleFavorite(entry);
    expect(store.getState().favorites).toHaveProperty('law-1');

    toggleFavorite(entry);
    expect(store.getState().favorites).not.toHaveProperty('law-1');
    } finally {
      unsubscribe();
    }
  });

  it('generates a readable share text with latest configuration', () => {
    const { store, unsubscribe } = createTestStore();
    try {
    const { setCategories, setKeyword, addHistory, generateShareText } = store.getState();

    setCategories(['administration', 'environment']);
    setKeyword('climate');
    addHistory({
      id: 'law-latest',
      title: 'Latest Law',
      category: 'administration',
      keyword: 'climate',
      timestamp: new Date().toISOString()
    });

    const shareText = generateShareText();
  expect(shareText).toContain('Latest Law');
  expect(shareText).toContain('カテゴリ: administration、environment');
  expect(shareText).toContain('キーワード「climate」');
  expect(shareText).toContain('#法令ガチャ');
    } finally {
      unsubscribe();
    }
  });
});
