/**
 * A1 — Admin /companies: list loads, detail, settings toggle, DB verify.
 */
import { withPage, ScenarioCtx } from './_shared';
import { snap, settle, tryClick, waitForApi, loadOk } from '../scenario-helpers';
import { sql } from '../db-helpers';

export const meta = { name: 'admin-companies', persona: 'admin' as const };

export async function run(ctx: ScenarioCtx) {
  const log = ctx.logger;

  await withPage(ctx, 'admin', async (page) => {
    log.resetHarvest();
    const { status, bodyText } = await loadOk(page, '/companies');
    if (status >= 500 || status === 404) {
      log.log({ spec_section: 'A1', severity: 'critical', category: 'functional', title: `/companies returned ${status}`, description: 'Index unreachable.', screenshot: await snap(page, meta.name, 'load-fail') });
      return;
    }

    const dbRows = await sql<{ id: string; name: string; itemize_invoice: any }>(`SELECT id, name, itemize_invoice FROM companies ORDER BY created_at ASC LIMIT 30`);
    const dbCount = dbRows?.length ?? 0;
    const tableVisible = await page.locator('table, [role="table"], [data-testid*="company"]').first().isVisible({ timeout: 4000 }).catch(() => false);
    const renderedNames = dbRows?.filter((r) => bodyText.includes(r.name)).length ?? 0;
    if (dbCount > 0 && renderedNames === 0 && !tableVisible) {
      log.log({ spec_section: 'A1', severity: 'high', category: 'functional', title: 'No company names from DB rendered on /companies', description: `DB has ${dbCount} companies; none of their names appear and no table found.`, screenshot: await snap(page, meta.name, 'no-render'), url: page.url() });
    }

    if (dbRows && dbRows.length > 0) {
      const target = dbRows.find((r) => bodyText.includes(r.name)) || dbRows[0];
      const opened = await tryClick(page, [new RegExp(target.name.split(' ')[0], 'i')]);
      if (opened) {
        await settle(page, 1000);
        const detailUrl = page.url();
        if (!/\/companies\//.test(detailUrl)) {
          log.log({ spec_section: 'A1', severity: 'medium', category: 'functional', title: 'Clicking company name did not navigate to detail page', description: `URL after click: ${detailUrl}`, url: detailUrl });
        } else {
          const toggleClicked = await tryClick(page, [/itemize/i, /per[- ]case invoice/i, /split invoice/i]);
          if (toggleClicked) {
            const saveResp = await waitForApi(page, /\/api\/companies\/.+/, async () => {
              await tryClick(page, [/^save$/i, /update/i]);
            }, 8000);
            if (saveResp && saveResp.status >= 200 && saveResp.status < 300) {
              const after = await sql<{ itemize_invoice: any }>(`SELECT itemize_invoice FROM companies WHERE id = $1`, [target.id]);
              const newVal = after?.[0]?.itemize_invoice;
              const oldVal = target.itemize_invoice;
              if (newVal === oldVal) {
                log.log({ spec_section: 'A1', severity: 'medium', category: 'data-integrity', title: 'itemize_invoice toggle did not persist', description: `before=${oldVal}; after=${newVal}`, db_assertion: `companies.itemize_invoice changed for id=${target.id}` });
              } else {
                await sql(`UPDATE companies SET itemize_invoice = $1 WHERE id = $2`, [oldVal, target.id]);
              }
            } else if (saveResp) {
              log.log({ spec_section: 'A1', severity: 'medium', category: 'functional', title: `Company save returned ${saveResp.status}`, description: JSON.stringify(saveResp.body).slice(0, 300) });
            }
          }
        }
      }
    } else if (dbRows === null) {
      log.log({ spec_section: 'A1', severity: 'info', category: 'data-integrity', title: 'DB unreachable for companies cross-check', description: 'Skipped DB-vs-UI count comparison.' });
    }
  });
}
