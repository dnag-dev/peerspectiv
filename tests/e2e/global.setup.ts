import { test as setup } from '@playwright/test';
import { clerk, clerkSetup } from '@clerk/testing/playwright';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '..', '.env.local') });

const ADMIN = 'tests/.auth/admin.json';
const CLIENT = 'tests/.auth/client.json';
const REVIEWER = 'tests/.auth/reviewer.json';

setup('global clerk setup', async () => {
  await clerkSetup();
});

async function signInAs(page: any, email: string) {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  await clerk.signIn({
    page,
    signInParams: {
      strategy: 'password',
      identifier: email,
      password: 'P33rspeCtiv!Ash2026#Demo',
    },
  });
  // Explicitly navigate to a protected page to force session cookie
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
}

setup('authenticate as admin', async ({ page }) => {
  await signInAs(page, 'admin@peerspectiv.com');
  await page.context().storageState({ path: ADMIN });
});

setup('authenticate as client', async ({ page }) => {
  await signInAs(page, 'kelli@horizonhealth.org');
  await page.context().storageState({ path: CLIENT });
});

setup('authenticate as reviewer', async ({ page }) => {
  await signInAs(page, 'rjohnson@peerspectiv.com');
  await page.context().storageState({ path: REVIEWER });
});
