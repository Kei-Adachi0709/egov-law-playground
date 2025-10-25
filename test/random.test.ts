/// <reference path="./vitest-globals.d.ts" />

import { MAJOR_SIX_LAWS, pickUniqueRandom, pickWeightedRandom } from '../src/lib/utils/random';

describe('random utils', () => {
  it('picks unique values and resets history when exhausted', () => {
    const values = ['A', 'B', 'C'] as const;
    const history = new Set<string>();
    const randomValues = [0, 0, 0, 0.8];
    const random = () => randomValues.shift() ?? 0;

    const first = pickUniqueRandom(values, { history, random });
    expect(first.value).toBe('A');
    expect(history.has('A')).toBe(true);

    const second = pickUniqueRandom(values, { history, random });
    expect(second.value).toBe('B');
    expect(history.size).toBe(2);

    const third = pickUniqueRandom(values, { history, random });
    expect(third.value).toBe('C');
    expect(history.size).toBe(3);

    const fourth = pickUniqueRandom(values, { history, random });
    expect(fourth.value).toBe('C');
    expect(history.size).toBe(1);
    expect(history.has('C')).toBe(true);
  });

  it('throws when duplicates are disallowed and pool exhausted', () => {
    const history = new Set<string>();
    pickUniqueRandom([1, 2], { history, random: () => 0 });
    pickUniqueRandom([1, 2], { history, random: () => 0 });

    expect(() => pickUniqueRandom([1, 2], { history, allowReset: false, random: () => 0 })).toThrow('Unique random pool exhausted');
  });

  it('respects weights and major six law multiplier', () => {
    const law = pickWeightedRandom(
      [
        { value: { lawName: '民法' } },
        { value: { lawName: '道路交通法' } }
      ],
      {
        majorSixMultiplier: 5,
        random: () => 0.2,
        getLawName: (item) => item.lawName
      }
    );

    expect(MAJOR_SIX_LAWS.has(law.lawName)).toBe(true);
  });

  it('throws when total weight is zero', () => {
    expect(() => pickWeightedRandom([{ value: 'X', weight: 0 }])).toThrow('Total weight must be greater than zero');
  });
});
