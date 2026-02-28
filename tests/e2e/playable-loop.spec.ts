import { test, expect } from '@playwright/test';

test('can start game and see playing hud state', async ({ page }) => {
  await page.goto('/');
  const startDialog = page.getByRole('dialog', { name: 'start-screen' });
  await expect(startDialog).toBeVisible();
  await page.getByRole('button', { name: 'Start Run' }).click();
  await expect(startDialog).toBeHidden();
});
