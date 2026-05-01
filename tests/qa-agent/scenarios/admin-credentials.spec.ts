/**
 * B2 — Admin /credentials: list expiring soon, sorted, color codes.
 */
import { withPage, ScenarioCtx } from './_shared';
import { snap, loadOk } from '../scenario-helpers';
import { sql } from '../db-helpers';

export const meta = { name: 'admin-credentials', persona: 'admin' as const };

export async function run(ctx: ScenarioCtx) {
  const log = ctx.logger;
  await withPage(ctx, 'admin', async (page) => {
    log.resetHarvest();
    const { status, bodyText } = await loadOk(page, '/credentials');
    if (status === 404) {
      log.log({ spec_section: 'B2', severity: 'medium', category: 'not-yet-built', title: '/credentials 404', description: 'Page missing.' });
      return;
    }
    if (status >= 500) {
      log.log({ spec_section: 'B2', severity: 'critical', category: 'functional', title: `/credentials ${status}`, description: 'Server error.', screenshot: await snap(page, meta.name, '5xx') });
      return;
    }
    const expiring = await sql<{ id: string; full_name: string; credential_valid_until: string }>(
      `SELECT id, full_name, credential_valid_until FROM reviewers
       WHERE credential_valid_until IS NOT NULL
         AND credential_valid_until BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '120 days'
       ORDER BY credential_valid_until ASC LIMIT 20`
    );
    if (expiring && expiring.length > 0) {
      const shown = expiring.filter((r) => bodyText.includes(r.full_name)).length;
      if (shown === 0) {
        log.log({ spec_section: 'B2', severity: 'high', category: 'functional', title: 'Expiring-soon reviewers not surfaced on /credentials', description: `DB has ${expiring.length} expiring; none rendered.`, screenshot: await snap(page, meta.name, 'no-render'), url: page.url() });
      }
    }
    // Color coding cue: at least red/amber/green semantics in markup
    const hasColorCue = await page.locator('[class*="red"], [class*="amber"], [class*="yellow"], [class*="green"]').first().isVisible({ timeout: 1500 }).catch(() => false);
    if (!hasColorCue) {
      log.log({ spec_section: 'B2', severity: 'low', category: 'visual', title: 'No red/amber/green color cues on /credentials', description: 'B2 color coding spec not visible.', url: page.url() });
    }
  });
}
