import { checkPage, ScenarioCtx } from './_shared';

export const meta = { name: 'client-reviews', persona: 'client' as const };
export async function run(ctx: ScenarioCtx) {
  await checkPage(ctx, 'client', {
    name: meta.name, path: '/portal/reviews', spec: 'I1/I10', persona: 'client',
    expectsText: ['review|case|provider|mrn'],
  });
}
