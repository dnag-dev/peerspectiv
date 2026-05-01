import { checkPage, ScenarioCtx } from './_shared';

export const meta = { name: 'client-dashboard', persona: 'client' as const };
export async function run(ctx: ScenarioCtx) {
  await checkPage(ctx, 'client', {
    name: meta.name, path: '/portal', spec: 'client-home', persona: 'client',
    expectsText: ['portal|review|provider|quality'],
    forbidsText: ['\\$NaN', 'undefined'],
  });
}
