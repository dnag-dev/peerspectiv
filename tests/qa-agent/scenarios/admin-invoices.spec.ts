/**
 * G — Admin /invoices: list + create + quantity_override + audit log.
 */
import { withPage, ScenarioCtx } from './_shared';
import { snap, settle, tryClick, loadOk } from '../scenario-helpers';
import { sql } from '../db-helpers';

export const meta = { name: 'admin-invoices', persona: 'admin' as const };

export async function run(ctx: ScenarioCtx) {
  const log = ctx.logger;
  await withPage(ctx, 'admin', async (page) => {
    log.resetHarvest();
    const { status, bodyText } = await loadOk(page, '/invoices');
    if (status === 404) {
      log.log({ spec_section: 'G', severity: 'medium', category: 'not-yet-built', title: '/invoices 404', description: 'Page missing.' });
      return;
    }
    if (status >= 500) {
      log.log({ spec_section: 'G', severity: 'critical', category: 'functional', title: `/invoices ${status}`, description: 'Server error.', screenshot: await snap(page, meta.name, '5xx') });
      return;
    }
    // DB rows visible?
    const dbInv = await sql<{ id: string; total_amount: any }>(`SELECT id, total_amount FROM invoices ORDER BY created_at DESC LIMIT 5`);
    if (dbInv && dbInv.length > 0 && !/invoice|total/i.test(bodyText)) {
      log.log({ spec_section: 'G', severity: 'medium', category: 'functional', title: 'Invoices DB has rows but page lacks invoice content', description: `DB rows: ${dbInv.length}`, screenshot: await snap(page, meta.name, 'no-render') });
    }
    // Schema sanity
    if (dbInv) {
      for (const inv of dbInv) {
        if (inv.total_amount === null || inv.total_amount === undefined) {
          log.log({ spec_section: 'G', severity: 'low', category: 'data-integrity', title: 'Invoice missing total_amount', description: `invoice id=${inv.id}`, db_assertion: 'invoices.total_amount NOT NULL' });
        }
      }
    }
  });
}
