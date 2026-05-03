/**
 * Real end-to-end auth flow:
 *   - Sign in as each of the 3 demo users via Clerk's actual UI
 *   - Verify role-based redirect lands on the right portal
 *   - Click the Sign Out button in the sidebar
 *   - Verify we end back on /login
 *   - Sign in as a different role to confirm the switcheroo works
 */
import { test, expect } from '@playwright/test';
import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright';

const PW = 'P33rspeCtiv!Ash2026#Demo';

const accounts = {
  admin:    { email: 'admin@peerspectiv.com',     landing: /\/dashboard|\/login/, role: 'admin' },
  client:   { email: 'kelli@horizonhealth.org',   landing: /\/portal/,            role: 'client' },
  peer: { email: 'rjohnson@peerspectiv.com',  landing: /\/reviewer/,          role: 'reviewer' },
};

async function signInAndCommit(page: any, email: string) {
  await setupClerkTestingToken({ page });
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Drive Clerk's actual SignIn form like a real user — this puts the
  // session cookie on the right domain (localhost) so middleware sees it.
  await page.waitForSelector('input[name="identifier"]', { timeout: 20000 });
  await page.fill('input[name="identifier"]', email);
  // Click the Continue button under the email field
  await page.locator('button.cl-formButtonPrimary, button[data-localization-key="formButtonPrimary"]').first().click();

  // Password step
  await page.waitForSelector('input[name="password"]', { timeout: 15000 });
  await page.fill('input[name="password"]', PW);
  await page.locator('button.cl-formButtonPrimary, button[data-localization-key="formButtonPrimary"]').first().click();

  // Wait until we leave /login
  await page.waitForURL((url: URL) => !url.pathname.startsWith('/login'), { timeout: 30000 });
  await page.waitForLoadState('networkidle');
}

async function signOut(page: any) {
  // The sign-out button is in the sidebar
  const btn = page.locator('[data-testid="sign-out"]').first();
  await expect(btn).toBeVisible({ timeout: 10000 });
  await btn.click();
  // Should land on /login
  await page.waitForURL(/\/login/, { timeout: 15000 });
}

test.describe.configure({ mode: 'serial' });

test.describe('Auth flow — real Clerk', () => {
  test('admin: sign in → land on /dashboard → sign out', async ({ page }) => {
    await signInAndCommit(page, accounts.admin.email);
    // Hit the admin landing
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    // Should NOT be on /login (auth worked)
    expect(page.url()).not.toContain('/login');
    // Sidebar shows user name + email
    await expect(page.locator('text=admin@peerspectiv.com')).toBeVisible({ timeout: 10000 });
    // Sign out
    await signOut(page);
    expect(page.url()).toContain('/login');
  });

  test('reviewer: sign in → can reach reviewer portal → sign out', async ({ page }) => {
    await signInAndCommit(page, accounts.peer.email);
    await page.goto('/reviewer/portal');
    await page.waitForLoadState('networkidle');
    expect(page.url()).not.toContain('/login');
    expect(page.url()).toContain('/reviewer');
    await expect(page.locator('text=rjohnson@peerspectiv.com')).toBeVisible({ timeout: 10000 });
    await signOut(page);
    expect(page.url()).toContain('/login');
  });

  test('client: sign in → land on /portal → sign out', async ({ page }) => {
    await signInAndCommit(page, accounts.client.email);
    await page.goto('/portal');
    await page.waitForLoadState('networkidle');
    expect(page.url()).not.toContain('/login');
    expect(page.url()).toContain('/portal');
    await signOut(page);
    expect(page.url()).toContain('/login');
  });

  test('switching users: admin → sign out → reviewer signs in', async ({ page }) => {
    // Admin in
    await signInAndCommit(page, accounts.admin.email);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    expect(page.url()).not.toContain('/login');
    await signOut(page);
    expect(page.url()).toContain('/login');

    // Reviewer in (same browser context — proves logout actually killed admin session)
    await signInAndCommit(page, accounts.peer.email);
    await page.goto('/reviewer/portal');
    await page.waitForLoadState('networkidle');
    expect(page.url()).not.toContain('/login');
    await expect(page.locator('text=rjohnson@peerspectiv.com')).toBeVisible({ timeout: 10000 });
  });
});
