/**
 * B1/B4 — Admin reviewers: list, multi-specialty, credential expiry color coding,
 * unavailable modal, max-case-load.
 */
import { withPage, ScenarioCtx } from './_shared';
import { snap, settle, tryClick, loadOk } from '../scenario-helpers';
import { sql } from '../db-helpers';

export const meta = { name: 'admin-reviewers', persona: 'admin' as const };

export async function run(ctx: ScenarioCtx) {
  const log = ctx.logger;

  await withPage(ctx, 'admin', async (page) => {
    log.resetHarvest();
    const { status, bodyText } = await loadOk(page, '/peers');
    if (status === 404) {
      log.log({ spec_section: 'B1', severity: 'medium', category: 'not-yet-built', title: '/reviewers 404', description: 'Reviewer admin page missing.' });
      return;
    }
    if (status >= 500) {
      log.log({ spec_section: 'B1', severity: 'critical', category: 'functional', title: `/reviewers ${status}`, description: 'Server error.', screenshot: await snap(page, meta.name, '5xx') });
      return;
    }

    const dbReviewers = await sql<{ id: string; full_name: string; specialties: string[] | null; credential_valid_until: string | null; max_case_load: number | null }>(
      `SELECT id, full_name, specialties, credential_valid_until, max_case_load FROM reviewers ORDER BY full_name LIMIT 30`
    );
    if (!dbReviewers || dbReviewers.length === 0) {
      log.log({ spec_section: 'B1', severity: 'info', category: 'data-integrity', title: 'No reviewers in DB', description: 'Cannot exercise B1/B4 without seeded reviewers.' });
      return;
    }

    const namesShown = dbReviewers.filter((r) => bodyText.includes(r.full_name)).length;
    if (namesShown === 0) {
      log.log({ spec_section: 'B1', severity: 'high', category: 'functional', title: 'No reviewer names from DB rendered on /reviewers', description: `DB has ${dbReviewers.length} reviewers; none rendered.`, screenshot: await snap(page, meta.name, 'no-render'), url: page.url() });
    }

    // Specialty surface check
    if (!/specialt/i.test(bodyText)) {
      log.log({ spec_section: 'B1', severity: 'medium', category: 'functional', title: 'No "specialty" label visible on reviewers admin', description: 'B1 multi-spec management should surface specialty column/badges.', url: page.url() });
    }
    // Caseload surface check
    if (!/load|capacit/i.test(bodyText)) {
      log.log({ spec_section: 'B4', severity: 'medium', category: 'functional', title: 'No caseload/capacity label on reviewers admin', description: 'B4 max_case_load admin path not visible.', url: page.url() });
    }

    // Credential coloring sanity: page should have some indicator near credential dates.
    const hasCredentialKw = /credential|expir/i.test(bodyText);
    if (!hasCredentialKw) {
      log.log({ spec_section: 'B2', severity: 'low', category: 'functional', title: 'No credential/expiration column on /reviewers', description: 'Credential-expiry color coding (B2) not surfaced.', url: page.url() });
    }

    // Click first reviewer for detail
    const target = dbReviewers[0];
    const opened = await tryClick(page, [new RegExp(target.full_name.split(' ')[0], 'i')]);
    if (opened) {
      await settle(page, 1000);
      const detailText = await page.locator('body').innerText({ timeout: 3000 }).catch(() => '');
      if (!new RegExp(target.full_name, 'i').test(detailText)) {
        log.log({ spec_section: 'B1', severity: 'medium', category: 'functional', title: 'Reviewer detail did not load with reviewer name', description: `Clicked ${target.full_name}; detail page text doesn't contain it.`, url: page.url() });
      }
      // Look for unavailable / set unavailable button
      const hasUnavail = await page.getByRole('button', { name: /unavailable|out of office|leave/i }).first().isVisible({ timeout: 1500 }).catch(() => false);
      if (!hasUnavail) {
        log.log({ spec_section: 'B5', severity: 'low', category: 'not-yet-built', title: 'No "set unavailable" control on reviewer detail', description: 'B5 unavailable workflow surface not found.', url: page.url() });
      }
    }
  });
}
