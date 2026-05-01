import { checkPage, ScenarioCtx } from './_shared';

export const meta = { name: 'admin-reports', persona: 'admin' as const };
export async function run(ctx: ScenarioCtx) {
  await checkPage(ctx, 'admin', {
    name: meta.name, path: '/reports', spec: 'I1-I11', persona: 'admin',
    expectsText: ['report'],
  });
}
