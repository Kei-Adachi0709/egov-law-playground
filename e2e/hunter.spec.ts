import { test, expect } from '@playwright/test';

import { setupLawApiMocks } from './law-api-mock';

test.describe('Hunter experience', () => {
  test('searches and views highlighted detail', async ({ page }) => {
    await setupLawApiMocks(page);

    await page.goto('/hunter');

    await page.getByLabel('キーワード').fill('ハイライト');
    await page.getByRole('button', { name: '検索する' }).click();

    const lawCard = page.getByRole('heading', { name: /テスト行政手続法/ });
    await expect(lawCard).toBeVisible();

    const detailButton = page.getByRole('button', { name: '詳細を見る' });
    await detailButton.click();

    await expect(page.getByText(/ハイライト用キーワード/)).toBeVisible();
    await expect(page.getByText(/カード表示と詳細表示/)).toBeVisible();
    await expect(page.locator('mark')).toHaveCount(1);
  });
});
