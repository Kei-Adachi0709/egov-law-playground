import { describe, expect, it } from 'vitest';

import { QUIZ_BANK_ENTRIES } from '../src/lib/utils/quizBank';
import {
  ensureValidQuestion,
  generateQuizQuestion,
  maskTextWithTerms,
  tokenizeCandidates
} from '../src/lib/utils/quizGenerator';

const sequenceRandom = (sequence: number[]): (() => number) => {
  let index = 0;
  return () => {
    const value = sequence[index % sequence.length];
    index += 1;
    return value;
  };
};

describe('quizGenerator', () => {
  it('tokenizes law text into distinct candidate terms', () => {
    const text = QUIZ_BANK_ENTRIES[0]?.text ?? '';
    const tokens = tokenizeCandidates(text);
    expect(tokens.length).toBeGreaterThan(0);
    const unique = new Set(tokens);
    expect(unique.size).toBe(tokens.length);
  });

  it('replaces masked terms with placeholder', () => {
    const masked = maskTextWithTerms('行政庁は標準処理期間を定める。', ['標準処理期間']);
    expect(masked).toContain('[ 〇〇 ]');
    expect(masked).not.toContain('標準処理期間');
  });

  it('generates quiz with unique choices and valid blank count', async () => {
    const question = await generateQuizQuestion({
      category: '行政手続法',
      difficulty: 'hard',
      mode: 'auto',
      random: sequenceRandom([0.1, 0.2, 0.3, 0.4])
    });

    expect(question.blanks?.length ?? 0).toBeGreaterThan(0);
    expect(question.maskedText).toBeDefined();
    ensureValidQuestion(question);
  });

  it('controls difficulty by increasing masked terms on harder levels', async () => {
    const easy = await generateQuizQuestion({
      category: '金融法',
      difficulty: 'easy',
      mode: 'auto',
      random: sequenceRandom([0.05, 0.2, 0.7])
    });
    const hard = await generateQuizQuestion({
      category: '金融法',
      difficulty: 'hard',
      mode: 'auto',
      random: sequenceRandom([0.05, 0.2, 0.7, 0.8])
    });

    expect(easy.blanks?.length ?? 0).toBeGreaterThan(0);
    expect((hard.blanks?.length ?? 1) >= (easy.blanks?.length ?? 0)).toBe(true);
  });
});
