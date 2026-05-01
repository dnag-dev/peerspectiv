import { checkPage, ScenarioCtx } from './_shared';

export const meta = { name: 'client-feedback', persona: 'client' as const };
export async function run(ctx: ScenarioCtx) {
  await checkPage(ctx, 'client', {
    name: meta.name, path: '/portal/feedback', spec: 'J3', persona: 'client',
    expectsText: ['feedback|comment'],
  });
}
