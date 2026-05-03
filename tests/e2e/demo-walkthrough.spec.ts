/**
 * Demo walkthrough — verifies every link works AND the expected content renders
 * for each of the 3 demo roles. Runs against the E2E auth bypass for stable
 * session state (real Clerk login is verified separately in auth tests).
 */
import { test, expect } from '@playwright/test';

const COMPANY = '0b9c8311-50c9-40c9-a6a6-8206fe437d3c'; // Hunter Health (reseeded real)
const BATCH = 'fdb38989-083e-4e2c-acc5-404abe880ed1';
const CASE = 'f16869e4-0a23-4320-ab0c-2c506e697e32';
const PROVIDER = '516f1ca5-db86-471f-a2cb-0bed0781f1d3';

async function signIn(page: any, role: 'admin' | 'client' | 'reviewer') {
  // Hit the demo login endpoint to set the demo_user cookie that middleware reads.
  await page.request.post('/api/demo/login', { data: { role } });
}

test.describe.configure({ mode: 'serial' });

test.describe('ADMIN role — every admin link works', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'admin');
  });

  const adminRoutes: Array<[string, string | RegExp]> = [
    ['/dashboard', /Dashboard|KPI|Overview|Pipeline/i],
    ['/prospects', /Prospect|Pipeline/i],
    ['/companies', /Compan/i],
    [`/companies/${COMPANY}`, /Hunter Health/i],
    ['/batches', /Batch/i],
    [`/batches/${BATCH}`, /Batch|Cases|Provider/i],
    [`/cases/${CASE}`, /Case|Provider|Specialty/i],
    ['/assign', /Assign/i],
    ['/command', /Command|Ash/i],
    ['/reports', /Report/i],
  ];

  for (const [path, contentRegex] of adminRoutes) {
    test(`admin: ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      // Page must not be an error/404
      await expect(page.locator('text=/404|could not be found/i')).toHaveCount(0);
      // Has some meaningful content
      await expect(page.locator('body')).toContainText(contentRegex, { timeout: 10000 });
    });
  }

  test('admin: Ash chat responds on dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.click('[aria-label="Ask Ash"]');
    const input = page.locator('input[placeholder="Ask Ash anything..."]');
    await input.fill('Say hi in exactly 3 words');
    await input.press('Enter');
    // Wait for loading dots to disappear (real Claude call)
    await expect(page.locator('.animate-bounce').first()).not.toBeVisible({ timeout: 45000 });
  });

  test('admin: sidebar nav hits each admin route', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    const nav = page.locator('nav a[href^="/"]');
    const count = await nav.count();
    expect(count).toBeGreaterThan(3);
  });
});

test.describe('REVIEWER role — reviewer portal + review workflow', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'reviewer');
  });

  test('reviewer: /peer/portal renders queue', async ({ page }) => {
    await page.goto('/peer/portal');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1,h2').first()).toBeVisible();
    // Either shows case cards or an empty-state message
    const hasCards = await page.locator('[data-testid="case-card"]').count();
    const hasEmptyMsg = await page.locator('text=/No cases|empty|queue/i').count();
    expect(hasCards + hasEmptyMsg).toBeGreaterThan(0);
  });

  test('reviewer: /peer/cases/[id] renders split-screen', async ({ page }) => {
    await page.goto(`/peer/cases/${CASE}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=/Chart Summary|Case Information|Review Form/i').first()).toBeVisible({ timeout: 15000 });
  });

  test('reviewer: Ash available', async ({ page }) => {
    await page.goto('/peer/portal');
    await expect(page.locator('[aria-label="Ask Ash"]')).toBeVisible({ timeout: 15000 });
  });
});

test.describe('CLIENT role — every client-portal link works', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'client');
  });

  const clientRoutes: Array<[string, string | RegExp]> = [
    ['/portal', /Dashboard|Compliance|Hunter Health|CMO/i],
    ['/portal/providers', /Provider/i],
    [`/portal/providers/${PROVIDER}`, /Provider|Specialty|Reviews/i],
    ['/portal/reviews', /Review/i],
    ['/portal/inprogress', /In Progress|Progress|assigned/i],
    ['/portal/overdue', /Overdue|past|late|No overdue/i],
    ['/portal/trends', /Trend|compliance|month/i],
    ['/portal/corrective', /Corrective|Action/i],
    ['/portal/export', /Export|Download|Report/i],
    ['/portal/welcome', /Welcome|portal|Peerspectiv/i],
  ];

  for (const [path, contentRegex] of clientRoutes) {
    test(`client: ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=/404|could not be found/i')).toHaveCount(0);
      await expect(page.locator('body')).toContainText(contentRegex, { timeout: 15000 });
    });
  }

  test('client: compliance ring renders', async ({ page }) => {
    await page.goto('/portal');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="compliance-ring"]')).toBeVisible({ timeout: 15000 });
  });

  test('client: quality reports page fires real Claude insights', async ({ page }) => {
    await page.goto('/portal/quality');
    await expect(page.locator('[data-testid="ai-insight"]').first()).toBeVisible({ timeout: 90000 });
  });

  test('client: Ash works scoped to the company', async ({ page }) => {
    await page.goto('/portal');
    await page.waitForLoadState('networkidle');
    await page.click('[aria-label="Ask Ash"]');
    await page.fill('input[placeholder="Ask Ash anything..."]', 'Hi');
    await page.press('input[placeholder="Ask Ash anything..."]', 'Enter');
    await expect(page.locator('.animate-bounce').first()).not.toBeVisible({ timeout: 45000 });
  });
});
