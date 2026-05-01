import { checkPage, ScenarioCtx } from './_shared';

export const meta = { name: 'admin-prospects', persona: 'admin' as const };
export async function run(ctx: ScenarioCtx) {
  await checkPage(ctx, 'admin', {
    name: meta.name, path: '/prospects', spec: 'B7/onboarding', persona: 'admin',
    expectsText: ['prospect|lead|onboard'],
  });
}
