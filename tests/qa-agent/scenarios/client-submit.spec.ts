import { checkPage, ScenarioCtx } from './_shared';

export const meta = { name: 'client-submit', persona: 'client' as const };
export async function run(ctx: ScenarioCtx) {
  await checkPage(ctx, 'client', {
    name: meta.name, path: '/portal/submit', spec: 'D5/D7', persona: 'client',
    expectsText: ['submit|upload|chart'],
  });
}
