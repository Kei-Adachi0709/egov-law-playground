/// <reference path="./vitest-globals.d.ts" />

import { highlightKeyword, highlightKeywords } from '../src/lib/utils/highlight';

describe('highlight utils', () => {
  it('highlights basic keyword', () => {
    const result = highlightKeyword('これは民法の条文です', '民法');
    expect(result).toBe('これは<mark>民法</mark>の条文です');
  });

  it('normalizes width and case when matching', () => {
    const result = highlightKeyword('第１２条に基づく', '12');
    expect(result).toBe('第<mark>１２</mark>条に基づく');
  });

  it('honours word boundaries for ASCII words', () => {
    const result = highlightKeyword('foobar baz', 'bar', { boundary: 'word' });
    expect(result).toBe('foobar baz');

    const withBoundary = highlightKeyword('foo bar baz', 'bar', { boundary: 'word' });
    expect(withBoundary).toBe('foo <mark>bar</mark> baz');
  });

  it('highlights multiple keywords sequentially', () => {
    const result = highlightKeywords('憲法と民法を学ぶ', ['憲法', '民法']);
    expect(result).toBe('<mark>憲法</mark>と<mark>民法</mark>を学ぶ');
  });
});
