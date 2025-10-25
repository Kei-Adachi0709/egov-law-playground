const defaultKeySerializer = (value: unknown): string => {
  if (value === null || typeof value !== 'object') {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const defaultLawNameAccessor = <T>(item: T): string | undefined => {
  if (item && typeof item === 'object' && 'lawName' in item && typeof (item as { lawName?: unknown }).lawName === 'string') {
    return (item as { lawName: string }).lawName;
  }
  return undefined;
};

const MAJOR_SIX_LAWS = new Set([
  '日本国憲法',
  '民法',
  '商法',
  '民事訴訟法',
  '刑法',
  '刑事訴訟法'
]);

export interface UniqueRandomOptions<T> {
  history?: Set<string>;
  getKey?: (value: T) => string;
  allowReset?: boolean;
  random?: () => number;
}

export interface UniqueRandomResult<T> {
  value: T;
  history: Set<string>;
}

export const pickUniqueRandom = <T>(items: readonly T[], options: UniqueRandomOptions<T> = {}): UniqueRandomResult<T> => {
  if (!items.length) {
    throw new Error('Cannot pick from an empty array');
  }

  const history = options.history ?? new Set<string>();
  const keySelector = options.getKey ?? defaultKeySerializer;
  const allowReset = options.allowReset ?? true;
  const randomFn = options.random ?? Math.random;

  let pool = items.filter((item) => !history.has(keySelector(item)));

  if (!pool.length) {
    if (!allowReset) {
      throw new Error('Unique random pool exhausted');
    }
    history.clear();
    pool = [...items];
  }

  const index = Math.floor(randomFn() * pool.length);
  const value = pool[Math.min(index, pool.length - 1)];
  history.add(keySelector(value));

  return { value, history };
};

export interface WeightedItem<T> {
  value: T;
  weight?: number;
  lawName?: string;
}

export interface WeightedRandomOptions<T> {
  defaultWeight?: number;
  majorSixMultiplier?: number;
  getLawName?: (value: T) => string | undefined;
  random?: () => number;
}

export const pickWeightedRandom = <T>(
  inputs: readonly (T | WeightedItem<T>)[],
  options: WeightedRandomOptions<T> = {}
): T => {
  if (!inputs.length) {
    throw new Error('Cannot pick from an empty set');
  }

  const defaultWeight = options.defaultWeight ?? 1;
  const majorMultiplier = options.majorSixMultiplier ?? 1;
  const lawNameAccessor = options.getLawName ?? defaultLawNameAccessor;
  const randomFn = options.random ?? Math.random;

  const entries = inputs.map<WeightedItem<T>>((entry) =>
    typeof entry === 'object' && entry !== null && 'value' in entry
      ? (entry as WeightedItem<T>)
      : { value: entry as T }
  );

  const normalized = entries
    .map((entry) => {
      const baseWeight = entry.weight ?? defaultWeight;
      const lawName = entry.lawName ?? lawNameAccessor(entry.value);
      const multiplier = lawName && MAJOR_SIX_LAWS.has(lawName) ? majorMultiplier : 1;
      const weight = Math.max(baseWeight * multiplier, 0);
      return { value: entry.value, weight };
    })
    .filter((entry) => entry.weight > 0);

  const totalWeight = normalized.reduce((sum, entry) => sum + entry.weight, 0);
  if (totalWeight <= 0) {
    throw new Error('Total weight must be greater than zero');
  }

  const threshold = randomFn() * totalWeight;
  let cumulative = 0;

  for (const entry of normalized) {
    cumulative += entry.weight;
    if (threshold <= cumulative) {
      return entry.value;
    }
  }

  return normalized[normalized.length - 1]?.value;
};

export { MAJOR_SIX_LAWS };
