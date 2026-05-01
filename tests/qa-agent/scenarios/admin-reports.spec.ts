/**
 * F — Admin /reports: QAPI, Reviewer Scorecard, Quality Certificate exports.
 */
import { withPage, ScenarioCtx } from './_shared';
import { snap, settle, tryClick, loadOk, downloadAndCheckPdf } from '../scenario-helpers';

export const meta = { name: 'admin-reports', persona: 'admin' as const };

export async function run(ctx: ScenarioCtx) {
  const log = ctx.logger;
  await withPage(ctx, 'admin', async (page) => {
    log.resetHarvest();
    const { status, bodyText } = await loadOk(page, '/reports');
    if (status === 404) {
      log.log({ spec_section: 'F', severity: 'medium', category: 'not-yet-built', title: '/reports 404', description: 'Page missing.' });
      return;
    }
    if (status >= 500) {
      log.log({ spec_section: 'F', severity: 'critical', category: 'functional', title: `/reports ${status}`, description: 'Server error.', screenshot: await snap(page, meta.name, '5xx') });
      return;
    }
    const tabs = ['qapi', 'scorecard', 'certificate', 'quality'];
    const present = tabs.filter((t) => new RegExp(t, 'i').test(bodyText));
    if (present.length === 0) {
      log.log({ spec_section: 'F', severity: 'medium', category: 'functional', title: '/reports missing tab labels', description: 'Could not find QAPI/Scorecard/Certificate/Quality tab markers.', url: page.url(), screenshot: await snap(page, meta.name, 'no-tabs') });
    }
    // Try to trigger any export to test download infrastructure
    const generated = await tryClick(page, [/^generate$/i, /export/i, /download/i]);
    if (generated) {
      const dl = await downloadAndCheckPdf(page, async () => {
        await page.waitForTimeout(500);
      }).catch(() => null);
      if (dl && !dl.ok && dl.size === 0) {
        log.log({ spec_section: 'F', severity: 'low', category: 'functional', title: 'Generate/export click did not produce a download', description: `reason: ${dl.reason || 'no file'}`, url: page.url() });
      }
    }
  });
}
