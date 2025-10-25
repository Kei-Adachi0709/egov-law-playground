import { describe, expect, it } from 'vitest';
import type { StateStorage } from 'zustand/middleware';

import { createQuizStore } from '../src/store/quizStore';

type Memory = Record<string, string>;

const createMemoryStorage = (): StateStorage => {
  const store: Memory = {};
  return {
    getItem: (name: string) => store[name] ?? null,
    setItem: (name: string, value: string) => {
      store[name] = value;
    },
    removeItem: (name: string) => {
      delete store[name];
    }
  };
};

const createTestStore = () => {
  const store = createQuizStore(createMemoryStorage());
  const unsubscribe = store.subscribe(() => {});
  return { store, unsubscribe } as const;
};

describe('quizStore', () => {
  it('updates streak and score on correct answers', () => {
    const { store, unsubscribe } = createTestStore();
    try {
      const { submitAnswer } = store.getState();

      submitAnswer({ correct: true, questionId: 'q1', difficulty: 'easy', choiceIndex: 0 });
      submitAnswer({ correct: true, questionId: 'q2', difficulty: 'easy', choiceIndex: 1 });

      const { score, streak, bestStreak, history } = store.getState();
      expect(score).toBe(2);
      expect(streak).toBe(2);
      expect(bestStreak).toBe(2);
      expect(history).toHaveLength(2);
    } finally {
      unsubscribe();
    }
  });

  it('records weak words on incorrect answers', () => {
    const { store, unsubscribe } = createTestStore();
    try {
      const { submitAnswer } = store.getState();

      submitAnswer({
        correct: false,
        weakWords: ['administration', 'procedures'],
        questionId: 'q1',
        difficulty: 'normal',
        choiceIndex: 2
      });
      submitAnswer({
        correct: false,
        weakWords: ['administration', 'environment'],
        questionId: 'q2',
        difficulty: 'normal',
        choiceIndex: 3
      });

      const { weakWords, score, streak, history } = store.getState();
      expect(weakWords).toEqual(['administration', 'procedures', 'environment']);
      expect(score).toBe(0);
      expect(streak).toBe(0);
      expect(history).toHaveLength(2);
    } finally {
      unsubscribe();
    }
  });

  it('resets progress correctly', () => {
    const { store, unsubscribe } = createTestStore();
    try {
      const { setQuestion, submitAnswer, resetProgress } = store.getState();

      setQuestion({
        id: 'quiz-1',
        prompt: 'What is the color of law?',
        choices: ['Blue', 'Green'],
        answerIndex: 0
      });
      submitAnswer({ correct: true, questionId: 'quiz-1', difficulty: 'easy', choiceIndex: 0 });
      resetProgress();

      const state = store.getState();
      expect(state.currentQuestion).toBeNull();
      expect(state.score).toBe(0);
      expect(state.streak).toBe(0);
      expect(state.weakWords).toHaveLength(0);
      expect(state.history).toHaveLength(0);
    } finally {
      unsubscribe();
    }
  });
});
