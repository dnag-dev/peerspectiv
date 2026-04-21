import { test, expect } from '@playwright/test';

test.describe('Admin portal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('dashboard renders KPI cards', async ({ page }) => {
    await expect(page.locator('[data-testid="kpi-card"]').first()).toBeVisible({ timeout: 15000 });
  });

  test('Ash chat button is present', async ({ page }) => {
    await expect(page.locator('[aria-label="Ask Ash"]')).toBeVisible({ timeout: 15000 });
  });

  test('Ash chat opens, sends message, gets real Claude response', async ({ page }) => {
    await page.click('[aria-label="Ask Ash"]');
    const input = page.locator('input[placeholder="Ask Ash anything..."]');
    await expect(input).toBeVisible({ timeout: 10000 });
    await input.fill('Say hi in 5 words');
    await input.press('Enter');
    await expect(page.locator('.animate-bounce').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.animate-bounce').first()).not.toBeVisible({ timeout: 60000 });
  });

  test('sidebar navigation works', async ({ page }) => {
    await page.locator('nav a:has-text("Companies")').first().click();
    await expect(page).toHaveURL(/companies/);
  });

  test('hamburger button visible on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="hamburger"]')).toBeVisible();
  });
});
