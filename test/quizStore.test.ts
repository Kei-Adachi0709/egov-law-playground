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

describe('quizStore', () => {
  it('updates streak and score on correct answers', () => {
    const store = createQuizStore(createMemoryStorage());
    const { submitAnswer } = store.getState();

    submitAnswer({ correct: true });
    submitAnswer({ correct: true });

    const { score, streak, bestStreak } = store.getState();
    expect(score).toBe(2);
    expect(streak).toBe(2);
    expect(bestStreak).toBe(2);
    store.destroy();
  });

  it('records weak words on incorrect answers', () => {
    const store = createQuizStore(createMemoryStorage());
    const { submitAnswer } = store.getState();

    submitAnswer({ correct: false, weakWords: ['administration', 'procedures'] });
    submitAnswer({ correct: false, weakWords: ['administration', 'environment'] });

    const { weakWords, score, streak } = store.getState();
    expect(weakWords).toEqual(['administration', 'procedures', 'environment']);
    expect(score).toBe(0);
    expect(streak).toBe(0);
    store.destroy();
  });

  it('resets progress correctly', () => {
    const store = createQuizStore(createMemoryStorage());
    const { setQuestion, submitAnswer, resetProgress } = store.getState();

    setQuestion({
      id: 'quiz-1',
      prompt: 'What is the color of law?',
      choices: ['Blue', 'Green'],
      answerIndex: 0
    });
    submitAnswer({ correct: true });
    resetProgress();

    const state = store.getState();
    expect(state.currentQuestion).toBeNull();
    expect(state.score).toBe(0);
    expect(state.streak).toBe(0);
    expect(state.weakWords).toHaveLength(0);
    store.destroy();
  });
});
