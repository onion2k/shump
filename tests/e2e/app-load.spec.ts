import { test, expect } from '@playwright/test';

test('app loads and shows start screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('dialog', { name: 'start-screen' })).toBeVisible();
});
