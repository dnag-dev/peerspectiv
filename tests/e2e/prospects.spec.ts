import { test, expect, request } from '@playwright/test';

/**
 * Phase 3 — prospect pipeline E2E.
 * Covers: UI renders, API lifecycle (create → dup check → generate → send → webhook → activate).
 */

test.describe('Prospect pipeline UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/prospects');
    await page.waitForLoadState('networkidle');
  });

  test('pipeline page loads with 4 columns', async ({ page }) => {
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15000 });
    const cols = page.locator('[data-testid="pipeline-column"]');
    await expect(cols).toHaveCount(4);
  });

  test('columns cover all four stages', async ({ page }) => {
    const stages = await page
      .locator('[data-testid="pipeline-column"]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('data-stage')));
    expect(new Set(stages)).toEqual(
      new Set(['prospect', 'contract_sent', 'contract_signed', 'active'])
    );
  });

  test('Add Prospect button is present', async ({ page }) => {
    await expect(page.locator('[data-testid="add-prospect"]')).toBeVisible();
  });

  test('Ash chat available on prospects page', async ({ page }) => {
    await expect(page.locator('[aria-label="Ask Ash"]')).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Prospect lifecycle API (real Drizzle, mock DocuSign)', () => {
  test('full flow: create → dup check → generate → send → webhook → activate', async ({
    playwright,
  }) => {
    const api = await playwright.request.newContext({
      baseURL: 'http://localhost:3000',
      extraHTTPHeaders: { 'x-demo-user-id': 'demo-admin' },
    });

    const uniq = Date.now();
    const payload = {
      name: `E2E Test Clinic ${uniq}`,
      contactPerson: 'Dr. Playwright Test',
      contactEmail: `pw-${uniq}@example.com`,
      state: 'KS',
      address: '1 Test Way',
      city: 'Testville',
      prospectSource: 'website',
      annualReviewCount: 20,
      reviewCycle: 'quarterly',
      onboardingNotes: 'E2E test — safe to delete',
    };

    // 1. Create
    const create = await api.post('/api/prospects', { data: payload });
    expect(create.status()).toBe(201);
    const { id: prospectId, status } = await create.json();
    expect(prospectId).toBeTruthy();
    expect(status).toBe('prospect');

    // 2. Duplicate check — same name, same state, should return 409
    const dup = await api.post('/api/prospects', {
      data: { ...payload, name: payload.name + ' Health', contactEmail: 'other@x.com' },
    });
    expect(dup.status()).toBe(409);
    const dupBody = await dup.json();
    expect(dupBody.error).toBe('potential_duplicate');
    expect(dupBody.matches.length).toBeGreaterThanOrEqual(1);

    // 3. Generate contract (real Claude pricing)
    const gen = await api.post('/api/contracts/generate', {
      data: { company_id: prospectId },
    });
    expect(gen.status()).toBe(200);
    const genBody = await gen.json();
    const contractId = genBody.data.contract.id;
    expect(contractId).toBeTruthy();
    expect(genBody.data.contract.status).toBe('draft');
    expect(genBody.data.pricing).toHaveProperty('per_review_rate');

    // 4. Send contract (DocuSign mock path)
    const send = await api.post('/api/contracts/send', {
      data: { contract_id: contractId },
    });
    expect(send.status()).toBe(200);
    const sendBody = await send.json();
    expect(sendBody.success).toBe(true);
    const envelopeId = sendBody.envelope_id;
    expect(envelopeId).toMatch(/^mock_/);

    // 5. Simulate DocuSign webhook — completed
    const webhook = await api.post('/api/webhooks/docusign', {
      data: {
        envelopeId,
        status: 'completed',
        recipients: {
          signers: [{ name: 'Dr. Playwright Test', ipAddress: '10.0.0.1' }],
        },
      },
    });
    expect(webhook.status()).toBe(200);
    expect(await webhook.json()).toEqual({ received: true });

    // 6. Activate company — grants portal access
    const activate = await api.post(`/api/companies/${prospectId}/activate`);
    expect(activate.status()).toBe(200);
    const actBody = await activate.json();
    expect(actBody.success).toBe(true);

    // 7. Verify lifecycle — company should now be in 'active'
    const pipeline = await api.get('/api/prospects');
    const data = await pipeline.json();
    const found = data.active.find((c: any) => c.id === prospectId);
    expect(found).toBeDefined();
    expect(found.status).toBe('active');
    expect(found.contractSentAt).toBeTruthy();
    expect(found.contractSignedAt).toBeTruthy();
    expect(found.portalAccessGrantedAt).toBeTruthy();

    await api.dispose();
  });
});
