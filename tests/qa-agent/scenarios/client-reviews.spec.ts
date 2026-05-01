/**
 * K3 — Client /portal/reviews: list and PHI security check.
 */
import { withPage, ScenarioCtx } from './_shared';
import { snap, loadOk } from '../scenario-helpers';

export const meta = { name: 'client-reviews', persona: 'client' as const };

export async function run(ctx: ScenarioCtx) {
  const log = ctx.logger;
  await withPage(ctx, 'client', async (page) => {
    log.resetHarvest();
    const { status, bodyText } = await loadOk(page, '/portal/reviews');
    if (status === 404) {
      log.log({ spec_section: 'K3', severity: 'medium', category: 'not-yet-built', title: '/portal/reviews 404', description: 'Page missing.' });
      return;
    }
    if (status >= 500) {
      log.log({ spec_section: 'K3', severity: 'critical', category: 'functional', title: `/portal/reviews ${status}`, description: 'Server error.', screenshot: await snap(page, meta.name, '5xx') });
      return;
    }
    // Strong PHI checks — these are blocker if matched
    const phiPatterns: Array<[RegExp, string]> = [
      [/\bSSN\b|social security number/i, 'SSN'],
      [/date of birth|\bDOB\b/i, 'DOB'],
      [/patient name/i, 'patient name label'],
    ];
    for (const [pat, label] of phiPatterns) {
      if (pat.test(bodyText)) {
        log.log({ spec_section: 'K3', severity: 'blocker', category: 'security', title: `PHI surface "${label}" visible on client reviews list`, description: 'Client portal must never reveal PHI per spec K3 / HIPAA.', url: page.url(), screenshot: await snap(page, meta.name, 'phi') });
      }
    }
  });
}
