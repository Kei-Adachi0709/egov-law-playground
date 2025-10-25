export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const randomFromArray = <T>(items: readonly T[]): T => {
  if (!items.length) {
    throw new Error('Cannot pick from an empty array');
  }

  const index = Math.floor(Math.random() * items.length);
  return items[index];
};

export const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

export { MAJOR_SIX_LAWS, pickUniqueRandom, pickWeightedRandom } from './random';
export { highlightKeyword, highlightKeywords } from './highlight';
export { persist } from './persist';
