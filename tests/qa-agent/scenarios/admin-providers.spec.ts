/**
 * A2/A3 — Admin providers: drill from company → providers; CSV bulk import.
 */
import path from 'path';
import { withPage, ScenarioCtx } from './_shared';
import { snap, settle, tryClick, loadOk, waitForApi } from '../scenario-helpers';
import { sql } from '../db-helpers';

export const meta = { name: 'admin-providers', persona: 'admin' as const };

export async function run(ctx: ScenarioCtx) {
  const log = ctx.logger;

  await withPage(ctx, 'admin', async (page) => {
    log.resetHarvest();
    const { status } = await loadOk(page, '/companies');
    if (status >= 500) {
      log.log({ spec_section: 'A2', severity: 'critical', category: 'functional', title: `/companies ${status}`, description: 'Cannot reach companies index.' });
      return;
    }
    // Navigate to first company detail
    const firstRow = page.locator('a[href*="/companies/"]').first();
    if (await firstRow.isVisible({ timeout: 4000 }).catch(() => false)) {
      await firstRow.click().catch(() => {});
      await settle(page, 1500);
    }
    const detailUrl = page.url();

    // Check provider section is on this page (or sub-route)
    const text = await page.locator('body').innerText({ timeout: 3000 }).catch(() => '');
    const hasProviderSection = /provider|npi|specialt/i.test(text);
    if (!hasProviderSection) {
      // try /providers sub-route
      const m = detailUrl.match(/\/companies\/([^/?#]+)/);
      if (m) {
        await loadOk(page, `/companies/${m[1]}/providers`);
      }
    }
    const hasImportBtn = await page.getByRole('button', { name: /import|upload|csv/i }).first().isVisible({ timeout: 2000 }).catch(() => false);
    if (!hasImportBtn) {
      log.log({ spec_section: 'A2', severity: 'medium', category: 'not-yet-built', title: 'Provider import / CSV upload control not visible', description: 'Could not find a button matching import|upload|csv on the providers section.', screenshot: await snap(page, meta.name, 'no-import-btn'), url: page.url() });
    }

    // Direct API attempt: bulk-create with QA marker
    const marker = `QA-${Date.now()}`;
    const company = await sql<any>(`SELECT id FROM companies ORDER BY created_at ASC LIMIT 1`);
    const companyId = company?.[0]?.id;
    if (companyId) {
      const before = await sql<{ c: string }>(`SELECT COUNT(*)::text c FROM providers WHERE company_id = $1`, [companyId]);
      const beforeN = parseInt(before?.[0]?.c || '0', 10);
      const resp = await page.request.post('/api/providers/bulk-create', {
        data: {
          company_id: companyId,
          providers: [
            { npi: `999${marker.slice(-7)}1`, first_name: 'QA', last_name: 'Test1', specialty: 'Cardiology' },
            { npi: `999${marker.slice(-7)}2`, first_name: 'QA', last_name: 'Test2', specialty: 'Neurology' },
          ],
        },
        headers: { 'content-type': 'application/json' },
      }).catch((e) => ({ status: () => 0, text: async () => String(e) }));
      const sc = (resp as any).status?.() ?? 0;
      const txt = await ((resp as any).text?.() ?? Promise.resolve(''));
      if (sc < 200 || sc >= 300) {
        if (sc === 404) {
          log.log({ spec_section: 'A2', severity: 'medium', category: 'not-yet-built', title: 'POST /api/providers/bulk-create 404', description: 'Endpoint not implemented.' });
        } else {
          log.log({ spec_section: 'A2', severity: 'medium', category: 'functional', title: `POST /api/providers/bulk-create returned ${sc}`, description: txt.slice(0, 300) });
        }
      } else {
        const after = await sql<{ c: string }>(`SELECT COUNT(*)::text c FROM providers WHERE company_id = $1`, [companyId]);
        const afterN = parseInt(after?.[0]?.c || '0', 10);
        if (afterN <= beforeN) {
          log.log({ spec_section: 'A2', severity: 'high', category: 'data-integrity', title: 'bulk-create reported success but DB count did not change', description: `before=${beforeN}, after=${afterN}`, db_assertion: 'providers count for company increased' });
        }
        // Cleanup
        await sql(`DELETE FROM providers WHERE first_name = 'QA' AND company_id = $1`, [companyId]);

        // Second call (dup detection)
        const resp2 = await page.request.post('/api/providers/bulk-create', {
          data: {
            company_id: companyId,
            providers: [
              { npi: `999${marker.slice(-7)}1`, first_name: 'QA', last_name: 'Test1', specialty: 'Cardiology' },
            ],
          },
        }).catch(() => null);
        if (resp2) {
          const j = await (resp2 as any).json().catch(() => null);
          if (j && j.duplicates === undefined && j.skipped === undefined && j.error === undefined) {
            log.log({ spec_section: 'A2', severity: 'low', category: 'functional', title: 'Re-import path does not surface dup info', description: `Response shape: ${JSON.stringify(j).slice(0, 200)}` });
          }
        }
      }
    } else {
      log.log({ spec_section: 'A2', severity: 'info', category: 'data-integrity', title: 'No company to anchor provider import test', description: 'companies table empty or unreachable.' });
    }
  });
}
