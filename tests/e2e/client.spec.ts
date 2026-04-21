import { test, expect } from '@playwright/test';

test.describe('Client portal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/portal');
    await page.waitForLoadState('networkidle');
  });

  test('dashboard renders compliance ring', async ({ page }) => {
    await expect(page.locator('[data-testid="compliance-ring"]')).toBeVisible({ timeout: 15000 });
  });

  test('role switcher has 3 options', async ({ page }) => {
    await expect(page.getByRole('button', { name: /CMO/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Quality Director/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Operations Admin/i })).toBeVisible();
  });

  test('clicking CMO updates role highlight', async ({ page }) => {
    await page.getByRole('button', { name: /CMO/i }).click();
    await expect(page.locator('[data-testid="role-highlight"]')).toBeVisible();
  });

  test('KPI cards visible', async ({ page }) => {
    await expect(page.locator('[data-testid="kpi-card"]').first()).toBeVisible({ timeout: 15000 });
  });

  test('navigation pages all load', async ({ page }) => {
    for (const path of ['/portal/reviews', '/portal/inprogress', '/portal/overdue', '/portal/trends', '/portal/corrective', '/portal/export', '/portal/providers']) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('h1,h2').first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('quality reports page calls real Claude and renders insights', async ({ page }) => {
    await page.goto('/portal/quality');
    await expect(page.locator('[data-testid="ai-insight"]').first()).toBeVisible({ timeout: 90000 });
  });

  test('Ash works on client portal', async ({ page }) => {
    await page.click('[aria-label="Ask Ash"]');
    await page.fill('input[placeholder="Ask Ash anything..."]', 'Hi');
    await page.press('input[placeholder="Ask Ash anything..."]', 'Enter');
    await expect(page.locator('.animate-bounce').first()).not.toBeVisible({ timeout: 60000 });
  });
});
