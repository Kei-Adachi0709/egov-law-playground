import { create, type StoreApi } from 'zustand';
import { persist, type PersistOptions, type StateStorage } from 'zustand/middleware';

import type { QuizQuestion } from '../types';
import { createStorage } from './storage';

export type QuizDifficulty = 'easy' | 'normal' | 'hard';

export type AnswerResult = {
  correct: boolean;
  weakWords?: string[];
  scoreDelta?: number;
};

interface QuizStateData {
  currentQuestion: QuizQuestion | null;
  score: number;
  difficulty: QuizDifficulty;
  streak: number;
  bestStreak: number;
  weakWords: string[];
}

interface QuizActions {
  setQuestion: (question: QuizQuestion | null) => void;
  submitAnswer: (result: AnswerResult) => void;
  setDifficulty: (difficulty: QuizDifficulty) => void;
  resetProgress: () => void;
  removeWeakWord: (word: string) => void;
  clearWeakWords: () => void;
}

export type QuizState = QuizStateData & QuizActions;

const QUIZ_STORE_VERSION = 1;
export const DEFAULT_QUIZ_DIFFICULTY: QuizDifficulty = 'normal';

export type QuizPersistedState = Pick<
  QuizState,
  'currentQuestion' | 'score' | 'difficulty' | 'streak' | 'bestStreak' | 'weakWords'
>;

const createInitialData = (): QuizPersistedState => ({
  currentQuestion: null,
  score: 0,
  difficulty: DEFAULT_QUIZ_DIFFICULTY,
  streak: 0,
  bestStreak: 0,
  weakWords: []
});

const uniqueWeakWords = (input: string[]): string[] => {
  const seen = new Set<string>();
  return input
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && !seen.has(item) && (seen.add(item), true));
};

const createPersistOptions = (
  storage?: StateStorage
): PersistOptions<QuizState, QuizPersistedState> => ({
  name: 'quiz-store',
  version: QUIZ_STORE_VERSION,
  storage: createStorage<QuizPersistedState>(storage),
  migrate: (persistedState: unknown) => {
    const base = createInitialData();
    if (!persistedState) {
      return base;
    }
    const incoming = persistedState as Partial<QuizPersistedState>;
    return {
      currentQuestion: incoming.currentQuestion ?? base.currentQuestion,
      score: incoming.score ?? base.score,
      difficulty: incoming.difficulty ?? base.difficulty,
      streak: incoming.streak ?? base.streak,
      bestStreak: incoming.bestStreak ?? base.bestStreak,
      weakWords: incoming.weakWords ? uniqueWeakWords(incoming.weakWords) : base.weakWords
    };
  },
  partialize: (state: QuizState) => ({
    currentQuestion: state.currentQuestion,
    score: state.score,
    difficulty: state.difficulty,
    streak: state.streak,
    bestStreak: state.bestStreak,
    weakWords: state.weakWords
  })
});

const creator = (
  set: StoreApi<QuizState>['setState']
): QuizState => ({
  ...createInitialData(),
  setQuestion: (question: QuizQuestion | null) => set({ currentQuestion: question }),
  submitAnswer: ({ correct, weakWords = [], scoreDelta }: AnswerResult) =>
    set((state: QuizState) => {
      const streak = correct ? state.streak + 1 : 0;
      const bestStreak = Math.max(state.bestStreak, streak);
      const delta = typeof scoreDelta === 'number' ? scoreDelta : correct ? 1 : 0;
      const score = Math.max(0, state.score + delta);
      const combinedWeakWords = correct ? state.weakWords : uniqueWeakWords([...state.weakWords, ...weakWords]);
      return {
        score,
        streak,
        bestStreak,
        weakWords: combinedWeakWords
      };
    }),
  setDifficulty: (difficulty: QuizDifficulty) => set({ difficulty }),
  resetProgress: () => set(createInitialData()),
  removeWeakWord: (word: string) =>
    set((state: QuizState) => ({
      weakWords: state.weakWords.filter((item) => item !== word)
    })),
  clearWeakWords: () => set({ weakWords: [] })
});

export const createQuizStore = (storage?: StateStorage): StoreApi<QuizState> =>
  create<QuizState>()(
    persist<QuizState>(creator, createPersistOptions(storage))
  );

export const useQuizStore = createQuizStore();
