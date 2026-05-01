import { checkPage, ScenarioCtx } from './_shared';

export const meta = { name: 'admin-reassignments', persona: 'admin' as const };
export async function run(ctx: ScenarioCtx) {
  await checkPage(ctx, 'admin', {
    name: meta.name, path: '/reassignments', spec: 'E3', persona: 'admin',
    expectsText: ['reassign|request|queue'],
  });
}
