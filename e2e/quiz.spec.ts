import { test, expect } from '@playwright/test';

import { setupLawApiMocks } from './law-api-mock';

const INITIAL_QUIZ_STATE = {
  version: 2,
  state: {
    currentQuestion: null,
    score: 0,
    difficulty: 'normal',
    streak: 0,
    bestStreak: 0,
    weakWords: [],
    history: []
  }
} as const;

test.describe('Quiz experience', () => {
  test('answers a generated question', async ({ page }) => {
    await setupLawApiMocks(page);

    await page.addInitScript((seed) => {
      window.localStorage.setItem('quiz-store', JSON.stringify(seed));
    }, INITIAL_QUIZ_STATE);

    await page.goto('/quiz');
    await page.getByRole('button', { name: 'クイズ開始' }).click();

  const choiceButtons = page.locator('article ul li button');
    await expect(choiceButtons).toHaveCount(4, { timeout: 10_000 });

    await choiceButtons.first().click();

    await expect(page.getByText(/正解です|残念/)).toBeVisible();
    await expect(page.getByRole('button', { name: '次の問題へ' })).toBeVisible();
  });
});
