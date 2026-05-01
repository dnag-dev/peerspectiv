import { checkPage, ScenarioCtx } from './_shared';

export const meta = { name: 'client-quality', persona: 'client' as const };
export async function run(ctx: ScenarioCtx) {
  await checkPage(ctx, 'client', {
    name: meta.name, path: '/portal/quality', spec: 'I5/I6/I9', persona: 'client',
    expectsText: ['quality|certif|score'],
  });
}
