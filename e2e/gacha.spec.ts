import { test, expect } from '@playwright/test';

import { setupLawApiMocks } from './law-api-mock';

const INITIAL_GACHA_STATE = {
  version: 1,
  state: {
    history: [],
    settings: {
      categories: [],
      keyword: '',
      historyLimit: 20
    },
    favorites: {}
  }
} as const;

test.describe('Gacha experience', () => {
  test('spins gacha and shows a card', async ({ page }) => {
    await setupLawApiMocks(page);

    await page.addInitScript((seed) => {
      window.localStorage.setItem('gacha-store', JSON.stringify(seed));
    }, INITIAL_GACHA_STATE);

    await page.goto('/gacha');

    const heading = page.getByRole('heading', { name: /テスト行政手続法/ });
    await expect(heading).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/第一条/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'e-Gov で確認する' })).toHaveAttribute(
      'href',
      /TEST-LAW-001/
    );

    const rerollButton = page.getByRole('button', { name: 'もう一度引く' });
    await rerollButton.click();
    await expect(heading).toBeVisible();
  });
});
