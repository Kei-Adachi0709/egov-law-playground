import { test, expect } from '@playwright/test';

import { setupLawApiMocks } from './law-api-mock';

test.describe('Gacha experience', () => {
  test('spins gacha and shows a card', async ({ page }) => {
    await setupLawApiMocks(page);

    await page.goto('/gacha');

    await page.getByRole('button', { name: '引く' }).click();

    await expect(page.getByRole('heading', { name: /テスト行政手続法/ })).toBeVisible();
    await expect(page.getByText(/第一条/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'e-Gov で確認する' })).toHaveAttribute(
      'href',
      /TEST-LAW-001/
    );
  });
});
