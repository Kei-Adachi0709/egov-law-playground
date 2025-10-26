import { test, expect } from '@playwright/test';

import { setupLawApiMocks } from './law-api-mock';

const INITIAL_SEARCH_STATE = {
  version: 1,
  state: {
    history: [],
    lastParams: null,
    page: 1,
    pageSize: 20
  }
} as const;

test.describe('Hunter experience', () => {
  test('searches and views highlighted detail', async ({ page }) => {
    await setupLawApiMocks(page);

    await page.addInitScript((seed) => {
      window.localStorage.setItem('search-store', JSON.stringify(seed));
    }, INITIAL_SEARCH_STATE);

    await page.goto('/hunter');

    await page.getByLabel('キーワード').fill('ハイライト');
    await page.getByRole('button', { name: '検索する' }).click();

  const lawTitle = page.getByText('テスト行政手続法', { exact: true });
  await expect(lawTitle).toBeVisible({ timeout: 10_000 });

    const detailButton = page.getByRole('button', { name: '詳細を見る' });
    await detailButton.click();

  await expect(page.getByText(/ハイライト用キーワード/)).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('mark')).toHaveCount(1);
  });
});
