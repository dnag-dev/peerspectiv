import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 120000, // pages with real Claude calls can take 30-60s
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: './tests/global-setup.ts',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 60000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /global\.setup\.ts/,
    },
  ],
  webServer: {
    command: 'E2E_AUTH_BYPASS=1 ANTHROPIC_API_KEY="$(grep ^ANTHROPIC_API_KEY .env.local | cut -d\'=\' -f2-)" npm run dev',
    url: 'http://localhost:3000/login',
    reuseExistingServer: true,
    timeout: 60000,
  },
});
