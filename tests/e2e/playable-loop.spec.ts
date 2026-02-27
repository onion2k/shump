import { test, expect } from '@playwright/test';

test('can start game and see playing hud state', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start Run' }).click();
  await expect(page.locator('.hud')).toHaveAttribute('data-state', 'playing');
});
