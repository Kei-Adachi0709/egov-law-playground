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

describe('gachaStore', () => {
  it('respects history limit when adding entries', () => {
    const store = createGachaStore(createMemoryStorage());
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
    store.destroy();
  });

  it('toggles favorites based on entry id', () => {
    const store = createGachaStore(createMemoryStorage());
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
    store.destroy();
  });

  it('generates a readable share text with latest configuration', () => {
    const store = createGachaStore(createMemoryStorage());
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
    expect(shareText).toContain('administration, environment');
    expect(shareText).toContain('climate');
    store.destroy();
  });
});
