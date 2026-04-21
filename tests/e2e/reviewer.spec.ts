import { test, expect } from '@playwright/test';

test.describe('Reviewer portal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/reviewer/portal');
    await page.waitForLoadState('networkidle');
  });

  test('queue dashboard loads', async ({ page }) => {
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15000 });
  });

  test('Ash available on reviewer portal', async ({ page }) => {
    await expect(page.locator('[aria-label="Ask Ash"]')).toBeVisible({ timeout: 15000 });
  });
});
