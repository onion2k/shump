import { test, expect } from '@playwright/test';

test('can start game and see playing hud state', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'pause-screen' })).toBeVisible();
});
