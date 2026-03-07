import { test, expect } from '@playwright/test';

test('can start game and see playing hud state', async ({ page }) => {
  await page.goto('/');
  const shell = page.locator('main.app-shell');
  await expect(shell).toHaveAttribute('data-game-state', 'boot');

  await page.keyboard.press('Enter');
  await expect(shell).toHaveAttribute('data-game-state', 'playing');

  await page.keyboard.press('Escape');
  await expect(shell).toHaveAttribute('data-game-state', 'paused');
});
