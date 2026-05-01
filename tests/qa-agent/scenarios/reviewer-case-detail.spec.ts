/**
 * C2 — Reviewer case detail: PDF + form + MRN field + attestation.
 */
import { withPage, ScenarioCtx } from './_shared';
import { snap, loadOk, settle } from '../scenario-helpers';
import { sql } from '../db-helpers';

export const meta = { name: 'reviewer-case-detail', persona: 'reviewer' as const };

export async function run(ctx: ScenarioCtx) {
  const log = ctx.logger;
  await withPage(ctx, 'reviewer', async (page) => {
    log.resetHarvest();
    const c = await sql<{ id: string }>(
      `SELECT rc.id FROM review_cases rc
       JOIN reviewers r ON r.id = rc.reviewer_id
       WHERE r.email = 'rjohnson@peerspectiv.com'
         AND rc.status NOT IN ('completed','submitted','closed') LIMIT 1`
    ).catch(() => null);
    if (!c || c.length === 0) {
      log.log({ spec_section: 'C2', severity: 'info', category: 'functional', title: 'No active case for rjohnson — cannot exercise detail page', description: 'Fixture has no assigned cases for the demo reviewer.' });
      return;
    }
    const { status, bodyText } = await loadOk(page, `/reviewer/cases/${c[0].id}`);
    if (status === 404) {
      log.log({ spec_section: 'C2', severity: 'medium', category: 'not-yet-built', title: 'Reviewer case detail 404', description: `case id=${c[0].id}` });
      return;
    }
    if (status >= 500) {
      log.log({ spec_section: 'C2', severity: 'critical', category: 'functional', title: `Case detail ${status}`, description: 'Server error.', screenshot: await snap(page, meta.name, '5xx') });
      return;
    }
    if (!/mrn/i.test(bodyText)) {
      log.log({ spec_section: 'C2', severity: 'medium', category: 'functional', title: 'Case detail missing MRN field', description: 'Spec C2: MRN must appear at the top.', url: page.url(), screenshot: await snap(page, meta.name, 'no-mrn') });
    }
    if (!/attest|sign|certif/i.test(bodyText)) {
      log.log({ spec_section: 'C2', severity: 'medium', category: 'functional', title: 'Case detail missing attestation block', description: 'Spec C2 requires an attestation block.', url: page.url() });
    }
    // PDF viewer iframe?
    const hasPdf = await page.locator('iframe, embed, object').first().isVisible({ timeout: 2000 }).catch(() => false);
    if (!hasPdf) {
      log.log({ spec_section: 'C2', severity: 'low', category: 'functional', title: 'No PDF viewer (iframe/embed) detected on case detail', description: 'Chart PDF may not be rendering inline.', url: page.url() });
    }
  });
}
