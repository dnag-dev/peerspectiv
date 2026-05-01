/**
 * A4 — Admin /batches: list + new batch wizard + auto-name.
 */
import path from 'path';
import { withPage, ScenarioCtx } from './_shared';
import { snap, settle, tryClick, loadOk, waitForApi } from '../scenario-helpers';
import { sql } from '../db-helpers';

export const meta = { name: 'admin-batches', persona: 'admin' as const };

export async function run(ctx: ScenarioCtx) {
  const log = ctx.logger;
  await withPage(ctx, 'admin', async (page) => {
    log.resetHarvest();
    const { status, bodyText } = await loadOk(page, '/batches');
    if (status === 404) {
      log.log({ spec_section: 'A4', severity: 'medium', category: 'not-yet-built', title: '/batches 404', description: 'Page missing.' });
      return;
    }
    if (status >= 500) {
      log.log({ spec_section: 'A4', severity: 'critical', category: 'functional', title: `/batches ${status}`, description: 'Server error.', screenshot: await snap(page, meta.name, '5xx') });
      return;
    }
    const dbBatches = await sql<{ id: string; name: string }>(`SELECT id, name FROM batches ORDER BY created_at DESC LIMIT 10`);
    if (dbBatches && dbBatches.length > 0) {
      const shown = dbBatches.filter((b) => b.name && bodyText.includes(b.name)).length;
      if (shown === 0) {
        log.log({ spec_section: 'A4', severity: 'high', category: 'functional', title: 'Batches list not rendering DB rows', description: `DB has ${dbBatches.length} recent batches; none shown.`, screenshot: await snap(page, meta.name, 'no-render') });
      }
    }
    // Try to open the new-batch wizard
    const opened = await tryClick(page, [/new batch/i, /create batch/i, /upload chart/i]);
    if (opened) {
      await settle(page, 800);
      const dialog = await page.locator('[role="dialog"], [data-testid*="modal"], [data-testid*="wizard"]').first().isVisible({ timeout: 2000 }).catch(() => false);
      if (!dialog) {
        log.log({ spec_section: 'A4', severity: 'low', category: 'functional', title: 'New-batch action did not open a dialog/modal', description: 'Could not detect wizard/modal element.', url: page.url() });
      }
    } else {
      log.log({ spec_section: 'A4', severity: 'low', category: 'not-yet-built', title: 'No "New batch" trigger visible', description: 'Could not find a button to start the wizard.', url: page.url() });
    }
  });
}
