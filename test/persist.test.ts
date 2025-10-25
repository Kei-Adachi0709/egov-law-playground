/// <reference path="./vitest-globals.d.ts" />

import { persist } from '../src/lib/utils/persist';

describe('persist utils', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    persist.clear();
  });

  it('returns default value when key is missing', () => {
    const fallback = persist.get('missing', { defaultValue: 'default' });
    expect(fallback).toBe('default');
  });

  it('stores and retrieves structured data', () => {
    const payload = { foo: 'bar', count: 1 };
    persist.set('payload', payload);

    const result = persist.get<typeof payload>('payload');
    expect(result).toEqual(payload);
  });

  it('falls back to in-memory storage when localStorage fails', () => {
    const setSpy = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    const getSpy = vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    const removeSpy = vi.spyOn(window.localStorage, 'removeItem').mockImplementation(() => {
      throw new Error('denied');
    });

    persist.set('memory-only', 'value');
    expect(persist.get('memory-only')).toBe('value');

    persist.remove('memory-only');
    expect(persist.get('memory-only')).toBeUndefined();

    setSpy.mockRestore();
    getSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
