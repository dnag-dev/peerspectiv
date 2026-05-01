import { checkPage, ScenarioCtx } from './_shared';

export const meta = { name: 'client-providers', persona: 'client' as const };
export async function run(ctx: ScenarioCtx) {
  await checkPage(ctx, 'client', {
    name: meta.name, path: '/portal/providers', spec: 'I8', persona: 'client',
    expectsText: ['provider|search|specialt'],
  });
}
