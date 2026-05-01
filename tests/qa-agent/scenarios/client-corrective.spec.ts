import { checkPage, ScenarioCtx } from './_shared';

export const meta = { name: 'client-corrective', persona: 'client' as const };
export async function run(ctx: ScenarioCtx) {
  await checkPage(ctx, 'client', {
    name: meta.name, path: '/portal/corrective', spec: 'J4', persona: 'client',
    expectsText: ['corrective|cap|action|plan'],
  });
}
