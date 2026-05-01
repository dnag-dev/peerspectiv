import { checkPage, ScenarioCtx } from './_shared';

export const meta = { name: 'admin-credentials', persona: 'admin' as const };
export async function run(ctx: ScenarioCtx) {
  await checkPage(ctx, 'admin', {
    name: meta.name, path: '/credentials', spec: 'B2/B3/B6', persona: 'admin',
    expectsText: ['credential|license|expir'],
  });
}
