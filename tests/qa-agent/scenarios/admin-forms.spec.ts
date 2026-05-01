/**
 * D1 — Admin /forms: form builder, yes/no field, allow N/A toggle.
 */
import { withPage, ScenarioCtx } from './_shared';
import { snap, settle, tryClick, loadOk } from '../scenario-helpers';

export const meta = { name: 'admin-forms', persona: 'admin' as const };

export async function run(ctx: ScenarioCtx) {
  const log = ctx.logger;
  await withPage(ctx, 'admin', async (page) => {
    log.resetHarvest();
    const { status, bodyText } = await loadOk(page, '/forms');
    if (status === 404) {
      log.log({ spec_section: 'D1', severity: 'medium', category: 'not-yet-built', title: '/forms 404', description: 'Page missing.' });
      return;
    }
    if (status >= 500) {
      log.log({ spec_section: 'D1', severity: 'critical', category: 'functional', title: `/forms ${status}`, description: 'Server error.', screenshot: await snap(page, meta.name, '5xx') });
      return;
    }
    if (!/form|template|builder/i.test(bodyText)) {
      log.log({ spec_section: 'D1', severity: 'medium', category: 'functional', title: '/forms missing form/builder content', description: 'Page does not look like a form admin/builder.', url: page.url(), screenshot: await snap(page, meta.name, 'shape') });
    }
    // Try to open a form builder
    const opened = await tryClick(page, [/new form/i, /create form/i, /builder/i, /add field/i]);
    if (opened) {
      await settle(page, 800);
      const fieldEditorVisible = await page.locator('[data-testid*="field"], [class*="field-editor"], [class*="form-builder"]').first().isVisible({ timeout: 2000 }).catch(() => false);
      if (!fieldEditorVisible && !/yes.?no|allow n\/a/i.test(await page.locator('body').innerText().catch(() => ''))) {
        log.log({ spec_section: 'D1', severity: 'low', category: 'functional', title: 'Form builder did not surface a field editor', description: 'Expected yes/no, allow-n/a controls per D1.', url: page.url() });
      }
    }
  });
}
