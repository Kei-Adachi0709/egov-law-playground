import { test, expect } from '@playwright/test';

import { setupLawApiMocks } from './law-api-mock';

test.describe('Quiz experience', () => {
  test('answers a generated question', async ({ page }) => {
    await setupLawApiMocks(page);

    await page.goto('/quiz');
    await page.getByRole('button', { name: 'クイズ開始' }).click();

    const choiceButtons = page.getByRole('button', { name: /選択肢|／/ });
    await expect(choiceButtons).toHaveCount(4, { timeout: 10_000 });

    await choiceButtons.first().click();

    await expect(page.getByText(/正解です|残念/)).toBeVisible();
    await expect(page.getByRole('button', { name: '次の問題へ' })).toBeVisible();
  });
});
